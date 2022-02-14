module.exports = (sequelize, Sequelize) => {
  const LikeComment = sequelize.define("likeComment", {
    vote: {
      type: Sequelize.BOOLEAN,
      unique: false,
      allowNull: false,
      defaultValue: 0,
    },
  });

  // Sequelize associations
  LikeComment.associate = (models) => {
    //   is linked to
    LikeComment.belongsTo(models.comment, {
      foreignKey: "commentId",
      as: "post",
    });
    LikeComment.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return LikeComment;
};
