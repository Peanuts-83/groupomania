const {
  user,
  post,
  comment,
  community,
  postReport,
  likePost,
  savePost,
  follower,
} = require("../models");

// Import the filesystem module
const fs = require("fs");

// * Create posts
exports.createPost = (req, res, next) => {
  // Find the community to create post
  community
    .findByPk(req.body.communityId)
    .then((result) => {
      if (!result) {
        return res.status(404).json({ message: "Community not found" });
      }

      if (req.file) {
        post
          .create({
            ...req.body,
            imageUrl: `/images/${req.file.filename}`,
            communityId: result.id,
            creatorId: req.auth.userID,
          })

          .then((datas) => {
            res.status(201).json({
              status: 201,
              message: " Post create successfully",
              datas,
            });
          })
          .catch((error) =>
            res.status(500).json({ error: error.name, message: error.message })
          );
      } else {
        post
          .create({
            ...req.body,
            communityId: result.id,
            creatorId: req.auth.userID,
          })

          .then((datas) => {
            res.status(201).json({
              status: 201,
              message: " Post create successfully",
              datas,
            });
          })
          .catch((error) =>
            res.status(500).json({ error: error.name, message: error.message })
          );
      }
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
};

// * Read one post by a specific ID
exports.readPostById = (req, res, next) => {
  post
    .findOne({
      where: {
        id: req.params.id,
      },
      include: [
        {
          model: user,
          as: "creator",
          attributes: ["id", "username", "imageUrl"],
        },
        {
          model: community,
          as: "category",
          attributes: ["id", "title", "about"],
        },
        {
          model: comment,
          as: "comments",
          attributes: ["id", "content", "likes"],
        },
      ],
    })
    .then((result) => {
      // TODO : Check if post exist
      if (!result) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.status(200).json({
        status: 200,
        message: "Post find with success",
        result,
      });
    })
    .catch((err) => {
      res.status(500).json({ err, error: { msg: "Couldn´t find post" } });
    });
};

// * Read all post by community
exports.readAllPostByCommunity = function (req, res, next) {
  community
    .findOne({
      where: {
        id: req.params.id,
      },
      include: [
        {
          model: post,
          as: "category",
          attributes: [
            "id",
            "title",
            "imageUrl",
            "content",
            "likes",
            "communityId",
            "creatorId",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 6,
    })
    .then((result) => {
      // TODO : Check if i find post by community
      if (!result) {
        return res
          .status(404)
          .json({ message: "Any post found in this community" });
      }

      return res.status(200).json({
        status: 200,
        message: "Posts find with success in this community",
        result,
      });
    })
    .catch((err) => {
      res.status(500).json({ err, error: { msg: "Couldn´t find post" } });
    });
};

// * Read all posts by community follow
exports.readAllPostByCommunityFollow = async (req, res, next) => {
  follower
    .findAll({
      where: { userId: req.auth.userID },
      include: [
        {
          model: community,
          required: true,
          include: {
            model: post,
            required: true,
            as: "category",
          },
        },
      ],
    })
    .then(async (result) => {
      return res.status(200).json({
        status: 200,
        message: "Followed community posts are found",
        result,
      });
    })
    .catch((err) => {
      res
        .status(500)
        .json({
          err,
          error: { msg: "Couldn´t find posts by followed community" },
        });
    });
};

// * Read all posts with more likes
exports.manyLikes = (req, res, next) => {
  likePost
    .findAll({
      where: {
        vote: [1],
      },
      limit: 6,
    })
    .then((result) => {
      // TODO : Check if i find post by community
      if (!result) {
        return res
          .status(404)
          .json({ message: "Any post found with lot of likes" });
      }
      return res.status(200).json({
        status: 200,
        message: "Posts find with lot of likes",
        result,
      });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ err, error: { msg: "Couldn´t find post with lot of likes" } });
    });
};

// * Read all posts
exports.readAllPosts = (req, res, next) => {
  post
    .findAll({
      include: [
        {
          model: user,
          as: "creator",
          attributes: ["id", "username", "imageUrl"],
        },
        {
          model: community,
          as: "category",
          attributes: ["id", "title", "about"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 6,
    })
    .then(async (result) => {
      // TODO : Check if post exist
      if (!result) {
        return res.status(404).json({ message: "Posts not found" });
      }

      const count = await post.count();
      // console.log(count);

      res.status(200).json({
        status: 200,
        message: "Posts find with success",
        count,
        result,
      });
    })
    .catch((err) => {
      res.status(500).json({ err, error: { msg: "Couldn´t find post" } });
    });
};

// * Update a post
exports.updatePost = (req, res, next) => {
  post
    .findOne({ where: { id: req.params.id } })
    .then((result) => {
      // TODO : Check if post exist
      if (!result) {
        return res.status(404).json({ message: "Post not found" });
      }
      // TODO : Check if current user is the owner of the post
      if (result.creatorId != req.auth.userID) {
        return res.status(403).json({
          error:
            "You are not the creator of this publication, you cannot modify it.",
        });
      }
      // TODO : gestion de l'image
      try {
        const file = req.file;
        if (file) {
          req.body.imageUrl = `/images/${req.file.filename}`;
          // TODO : Delete the old image
          try {
            // Si je trouve une image à mon utilisateur
            if (result.imageUrl) {
              // je récupère l'image de mon utilisateur
              const filename = result.imageUrl.split("/images/")[1];
              // je supprime l'image
              fs.unlinkSync(`images/${filename}`);
            }
          } catch (error) {
            return res.status(404).json({ message: "Image not found" });
          }
        }
      } catch (error) {
        res.status(401).json({ error: { msg: "Couldn´t edit image Post" } });
      }

      // TODO : gestion du text
      result
        .update(req.body, { where: { id: result.id } })
        .then(() => {
          res.status(200).json({
            message: "Post updated",
            status: 200,
            datas: result,
          });
        })
        .catch((err) =>
          res.status(500).json({ error: err.name, message: err.message })
        );
    })
    .catch((err) => {
      const message = "Post could not be edited";
      res.status(500).json({ error: err.message, message });
    });
};

// * Delete post
exports.deletePost = (req, res, next) => {
  // TODO : Must be admin or moderator to delete a post
  post
    .findOne({ where: { id: req.params.id } })
    .then((result) => {
      if (!result) {
        return res.status(404).json({ message: "Post not exists" });
      }

      // ! Must be the owner
      if (req.auth.userID !== result.creatorId) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // TODO : Delete file
      if (result.imageUrl == null) {
        post
          .destroy({ where: { id: req.params.id } })
          .then(() =>
            res.status(200).json({
              status: 200,
              message: "Post has been deleted!",
            })
          )
          .catch((err) => res.status(501).json(err));
      } else {
        const imagePost = result.imageUrl.split("/images/")[1];
        fs.unlink(`images/${imagePost}`, () => {
          post
            .destroy({ where: { id: req.params.id } })
            .then(() =>
              res.status(200).json({
                status: 200,
                message: "Post has been deleted!",
              })
            )
            .catch((err) => res.status(500).json(err));
        });
      }
    })
    .catch((err) => {
      res
        .status(500)
        .json({ err, error: { msg: "Couldn´t delete this post" } });
    });
};

// * Like post
// ? gestion neutre si pas like et pas dislike
exports.likePost = async (req, res, next) => {
  let like = req.body.vote;

  // TODO : Find the post to be like
  post
    .findOne({ where: { id: req.params.id } })
    .then(async (result) => {
      if (!result) {
        return res.status(404).json({ message: "Post not exists" });
      }
      // ? Search if current user already like of dislike this post
      const likePostFind = await likePost.findOne({
        where: { userId: req.auth.userID, postId: result.id },
      });

      function changeLike(userId, postId, state) {
        switch (state) {
          case -1:
            if (likePostFind) {
              // Edit row to set vote to -1
              // UPDATE
              likePost
                .update(req.body, {
                  where: {
                    userId,
                    postId,
                  },
                })
                .then((datas) => {
                  return res.status(200).json({
                    status: 200,
                    message: "You disliked this post",
                    data: datas,
                  });
                })
                .catch(next);
            } else {
              // Create row and set vote to -1
              // INSERT
              likePost.create({
                vote: -1,
                userId,
                postId,
              });
            }
            break;

          case 0:
            likePost.destroy({ where: { userId, postId } });
            return res
              .status(200)
              .json({ message: "you removed your like or your dislike" });
            break;

          case 1:
            if (likePostFind) {
              // Edit row to set vote to 1
              // UPDATE
              likePost
                .update(req.body, {
                  where: {
                    userId,
                    postId,
                  },
                })
                .then((datas) => {
                  return res.status(200).json({
                    status: 200,
                    message: "You loved this post",
                    data: datas,
                  });
                })
                .catch(next);
            } else {
              // Create row and set vote to 1
              // INSERT
              likePost.create({
                vote: 1,
                userId,
                postId,
              });
            }
            break;
        }
      }

      // changeLike(req.auth.userID, result.id, like);

      switch (like) {
        // If it is a like
        case 1:
          changeLike(req.auth.userID, result.id, 1);
          // return res.status(200).json({ message: "You loved this post" });
          break;

        // if it's nolike/nodislike
        case 0:
          changeLike(req.auth.userID, result.id, 0);
          // return res.status(200).json({ message: "you removed your like or your dislike" });
          break;

        // if it's a dislike
        case -1:
          changeLike(req.auth.userID, result.id, -1);
          // return res.status(200).json({ message: "You disliked this post" });
          break;
        default:
          break;
      }
    })
    .catch((err) => {
      res.status(500).json({ err, error: { msg: "Couldn´t like post" } });
    });
};

// * Report post
exports.reportPost = async (req, res) => {
  // Find the community to report
  post
    .findByPk(req.params.id)
    .then((post) => {
      if (!post) {
        return res.status(404).json({ message: "Post not exists" });
      }

      postReport.create({
        ...req.body,
        postId: post.id,
        userId: req.auth.userID,
      });

      return res.status(200).json({
        status: 200,
        message: "Post successfully reported",
      });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
};

// * Save post
exports.saveUnsavePost = (req, res) => {
  let save = req.body.save;
  // TODO : Find the post to be save
  post
    .findOne({ where: { id: req.params.id } })
    .then((post) => {
      if (!post) {
        return res.status(404).json({ message: "Post not exists" });
      }
      // console.log(post)
      // TODO : Check if the current user is in the list of saved posts
      savePost
        .findOne({
          where: { userId: req.auth.userID, postId: post.id },
        })
        .then((result) => {
          // TODO : If user don't already save the post
          if (!result && save == true) {
            savePost.create({
              save: true,
              postId: post.id,
              userId: req.auth.userID,
            });

            return res.status(200).json({ message: "You saved this post" });
          }

          // TODO : If user want to unsave
          if (result && save == false) {
            savePost.destroy({
              where: { userId: req.auth.userID, postId: post.id },
            });

            return res.json({
              message: "The post is no longer saved",
            });
          }
        })
        .catch((err) => {
          res.status(500).json({ error: err.name, message: err.message });
        });
    })
    .catch((err) => {
      res.status(500).json({ err, error: { msg: "Couldn´t save this post" } });
    });
};
