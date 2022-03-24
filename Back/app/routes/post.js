const express = require("express");
const router = express.Router();

//* Post controller
const postsCtrl = require("../controllers/post");

//* Middlewares
const { isLoggedIn, isAdmin } = require("../middleware/auth");
const multer = require("../middleware/multer-config");

//=================================>
//* CREATE A POST
//=================================>
router.post("/", isLoggedIn, multer, postsCtrl.createPost);

//=================================>
//* READ A POST BY ID
//=================================>
router.get("/read/:id", isLoggedIn, postsCtrl.readPostById);

//=================================>
//* READ ALL POSTS
//=================================>
router.get("/readAll", isLoggedIn, postsCtrl.readAllPosts);

// * Find all posts by community
router.get("/readAllPostByCommunity/:id", isLoggedIn, postsCtrl.readAllPostByCommunity);

// * Find all posts by community follow
router.get(
  "/readAllPostByCommunityFollow/:id",
  isLoggedIn,
  postsCtrl.readAllPostByCommunityFollow
);

// * Find all posts with a lot of likes
router.get("/readAllPostMoreLikes", isLoggedIn, postsCtrl.readAllPostMoreLikes);

//=================================>
//* UPDATE A POST
//=================================>
router.patch("/update/:id", isLoggedIn, multer, postsCtrl.updatePost);

//=================================>
//* DELETE A POST
//=================================>
router.delete("/delete/:id", isLoggedIn, postsCtrl.deletePost); // add isAdmin or isModerator

//=================================>
//* REPORT A POST
//=================================>
router.post("/:id/reports", isLoggedIn, postsCtrl.reportPost);

//=================================>
//* LIKE OR DISLIKE A POST
//=================================>
router.post("/:id/likes", isLoggedIn, postsCtrl.likeDislikePost);

//=================================>
//* SAVE OR UNSAVE A POST
//=================================>
router.post("/:id/save", isLoggedIn, postsCtrl.saveUnsavePost);

module.exports = router;
