// const config = require("../config/auth.config");
const { user, refreshToken: RefreshToken } = require("../models");
const { userReport } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const CryptoJS = require("crypto-js");
// Import the filesystem module
const fs = require("fs");
const path = require("path");

//=================================>
/////////////////// ENCRYPTED EMAIL
//=================================>
function encrypted(email) {
  return CryptoJS.AES.encrypt(
    email,
    CryptoJS.enc.Base64.parse(process.env.PASSPHRASE),
    {
      iv: CryptoJS.enc.Base64.parse(process.env.IV),
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString();
}

//=================================>
/////////////////// DECRYPT EMAIL
//=================================>
function decryptEmail(email) {
  var bytes = CryptoJS.AES.decrypt(
    email,
    CryptoJS.enc.Base64.parse(process.env.PASSPHRASE),
    {
      iv: CryptoJS.enc.Base64.parse(process.env.IV),
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Check if the string is an email.
function validateEmail(email) {
  const res =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return res.test(String(email).toLowerCase());
}

// Password regex
const passwordRegex = new RegExp(
  /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,16}$/
);

exports.signup = async (req, res, next) => {
  // Check if request contain username and email
  if (!req.body.username && !req.body.email) {
    return res.status(400).json({ error: "Content can not be empty!" });
  }

  // Check email validation
  if (!validateEmail(req.body.email)) {
    return res.status(400).json({ error: "L'email indiqué est invalide." });
  }

  // Check password validation
  if (passwordRegex.test(req.body.password) == false) {
    return res.status(401).send("Please enter a strong password");
  }

  // Path to my default image
  // image = `${req.protocol}://${req.get("host")}/images/public/anonyme_avatar.png`;

  //  Crypte email
  const emailCrypted = encrypted(req.body.email);

  // Hash password
  bcrypt
    .hash(req.body.password, 10)
    .then((hashPass) => {
      const userObject = {
        // formulaire d'inscription avec username, email, password
        ...req.body,
        email: emailCrypted,
        password: hashPass,
        // imageUrl: req.file ? req.file.location : image,
      };
      user
        .create(userObject)
        .then((createdUser) => {
          res.status(201).send({
            status: 200,
            message: "User created successfully",
            createdUser,
          });
        })
        .catch((error) => {
          res.status(500).json({ error });
        });
    })
    .catch((error) =>
      res.status(500).json({
        error: error.name,
        message:
          error.message || "Some error occurred while creating the User.",
      })
    );
};

// Connected a user
exports.login = (req, res) => {
  var emailEncrypted = encrypted(req.body.email);
  user
    .findOne({
      where: {
        email: emailEncrypted,
      },
    })
    .then(async (user) => {
      if (!user) {
        return res.status(404).json({ message: "User Not found." });
      }
      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );
      if (!passwordIsValid) {
        return res.status(401).json({
          accessToken: null,
          message: "Invalid Password!",
        });
      }
      var token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWTExpirationTest, // 24 hours
      });
      // expose the POST API for creating new Access Token from received Refresh Token
      let refreshToken = await RefreshToken.createToken(user.id);
      res.status(200).json({
        status: 200,
        accessToken: token,
        refreshToken: refreshToken,
        user,
      });
    })
    .catch((error) => {
      res.status(500).json({
        error: error.name,
        message: error.message,
      });
    });
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;
  if (requestToken == null) {
    return res.status(403).json({ message: "Refresh Token is required!" });
  }
  try {
    let refreshToken = await RefreshToken.findOne({
      where: { token: requestToken },
    });
    // console.log(refreshToken);
    if (!refreshToken) {
      res.status(403).json({ message: "Refresh token is not in database!" });
      return;
    }
    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.destroy({ where: { id: refreshToken.id } });

      res.status(403).json({
        message: "Refresh token was expired. Please make a new signin request",
      });
      return;
    }
    const user = await refreshToken.getUser();
    let newAccessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWTExpiration, // 24 hours
    });
    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: refreshToken.token,
    });
  } catch (err) {
    return res.status(500).send({ message: err });
  }
};

// Read user info
exports.readUser = async (req, res) => {
  user
    .findOne({
      include: {
        all: true,
      },
      where: {
        id: req.auth.userID,
      },
    })
    .then((data) => {
      var emailEncrypted = data.email;
      data.email = decryptEmail(emailEncrypted);
      res.status(200).json({
        status: 200,
        data,
      });
    })
    .catch((error) =>
      res.status(500).json({
        error: error.name,
        message: error.message,
      })
    );
};

// Find a single user with an username
exports.readByName = async (req, res) => {
  user
    .findOne({
      include: {
        all: true,
      },
      where: {
        username: req.body.username,
      },
    })
    .then((result) => {
      if (!result) {
        return res.status(404).json({ message: "User Not Found." });
      }
      res.status(200).json({
        status: 200,
        data: result,
      });
    })
    .catch((error) => {
      res.status(500).json({
        error: error.name,
        message: error.message,
      });
    });
};

// Retrieve all Users from the database.
exports.readAll = (req, res) => {
  user
    .findAll()
    .then((users) => {
      if (users.length <= 0) {
        return res.status(404).json({ message: "Users not found" });
      }
      res.status(200).json({
        status: 200,
        data: users,
      });
    })
    .catch((error) =>
      res.status(500).json({
        error: error.name,
        message: error.message,
      })
    );
};

// Update
exports.update = async (req, res) => {
  // 1 formulaire - 1 Body avec firstName, lastName, username, email, password, imageUrl
  user
    .findOne({ where: { id: req.auth.userID } })
    .then(async (result) => {
      if (!result) {
        return res.status(404).json({ message: "User not found" });
      }

      // Gestion e-mail
      try {
        if (req.body.email) {
          req.body.email = encrypted(req.body.email);
        }
      } catch (error) {
        console.log(error.message);
      }

      // Gestion password ==> req.body.password
      try {
        if (req.body.newPassword) {
          const hashPass = await bcrypt.hash(req.body.newPassword, 10);
          req.body.password = hashPass;
        }
      } catch (error) {
        console.log(error.message);
      }

      // Gestion image
      try {
        const file = req.file;
        if (file) {
          // console.log(file);
          req.body.imageUrl = `/images/${req.file.filename}`;
          // console.log(req.file.filename);

          // Delete the old image
          try {
            // Si je trouve une image à mon utilisateur
            if (result.imageUrl) {
              // je récupère l'image de mon utilisateur
              const filename = result.imageUrl.split("/images/")[1];
              // je supprime l'image
              fs.unlinkSync(`images/${filename}`);
            }
          } catch (error) {
            console.log(error);
          }
        }
      } catch (error) {
        console.log(error.message);
      }

      // console.log(req.body);
      result
        .update(req.body, { where: { id: result.id } })
        .then(() => {
          res.status(200).json({
            message: " User updated",
            status: 200,
            data: result,
          });
        })
        .catch((error) =>
          res.status(500).json({ error: error.name, message: error.message })
        );
    })
    .catch((error) => {
      const message = "User could not be changed";
      res.status(500).json({ error: error.message, message });
    });
};

// Delete a user with the specified id in the request
exports.delete = async (req, res) => {
  user
    .findOne({ where: { id: req.auth.userID } })
    .then((result) => {
      if (result.imageUrl == null) {
        user
          .destroy({
            where: {
              id: req.auth.userID,
            },
          })
          .then(() =>
            res.status(200).json({
              message:
                "Account deleted successfully, see you soon " + result.username,
            })
          )
          .catch((error) => res.status(501).json(error));
      } else {
        const imageProfile = result.imageUrl.split("/images/")[1];
        fs.unlink(`images/${imageProfile}`, () => {
          user
            .destroy({
              where: {
                id: req.auth.userID,
              },
            })
            .then(() =>
              res.status(200).json({
                message:
                  "Account deleted successfully, see you soon " +
                  result.username,
              })
            )
            .catch((error) => res.status(501).json(error));
        });
      }
    })
    .catch((error) => {
      const message = "User could not be deleted";
      res.status(500).json({ error: error.message, message });
    });
};

// Export user info
exports.exportUser = async (req, res) => {
  user
    .findOne({
      include: [
        { association: "comments" },
        { association: "posts" },
        { association: "moderators" },
        { association: "likePosts" },
        { association: "userReported" },
        { association: "postReport" },
        { association: "replies" },
        { association: "messageToUserId" },
      ],
      where: {
        id: req.auth.userID,
      },
    })
    .then((datas) => {
      var emailEncrypted = datas.email;
      datas.email = decryptEmail(emailEncrypted);
      const dataFile = path.join(
        __dirname,
        "export",
        `datasUser.${req.auth.userID}.txt`
      );
      const file = JSON.stringify(datas, null, 4);
      fs.writeFileSync(dataFile, file);
      return res.status(200).json({
        status: 200,
        file,
      });
    })
    .catch((error) =>
      res.status(500).json({
        error: error.name,
        message: error.message,
      })
    );
};

// Report a user
exports.report = async (req, res) => {
  user
    .findOne({ where: { id: req.auth.userID } })
    .then(async (currUser) => {
      if (!currUser) {
        return res.status(404).json({ error: "User not found" });
      }
      // I find the user to report
      const { id } = req.params;
      const targetUser = await user.findOne({ where: { id } });
      if (!targetUser) {
        return res.status(404).json({ error: "Reportable user not found." });
      }

      // I check if a report has already been made
      const isAlreadyReported = await userReport.count({
        where: { userReportedId: targetUser.id, fromUserId: currUser.id },
      });
      if (isAlreadyReported) {
        return res
          .status(409)
          .json({ message: "You have already reported this user" });
      }

      userReport
        .create({
          userReportedId: targetUser.id,
          fromUserId: currUser.id,
          content: req.body.content,
        })
        .then(() => {
          res.status(201).json({
            message:
              " User" +
              " " +
              targetUser.username +
              " " +
              "reported successfully",
          });
        })
        .catch((error) =>
          res.status(500).json({ error: error.name, message: error.message })
        );
    })
    .catch((error) => {
      const message = "Reporting not possible";
      res.status(500).json({ error: error.message, message });
    });
};

// Logout
// exports.logout = async (req, res, next) => {
//   try {
//     const { refreshToken } = req.body;
//     if (!refreshToken) throw new Error(
//       "Vous n'avez plus accès"
//     );

//     const userId = await verifyRefreshToken(refreshToken)
//     client.DEL(userId, (err, val) => {
//       if (err) {
//         console.log(err.message);
//         throw createError.InternalServerError();
//       }
//       console.log(val);
//       res.sendStatus(204);
//     });

//  } catch (error) {
//    next(error)
//    res.status(500).send({
//      meta: {
//        type: "error",
//        status: 500,
//        message: "server error",
//      },
//    });
//  }
// };


