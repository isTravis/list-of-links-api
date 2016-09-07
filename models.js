"use strict";

if (process.env.NODE_ENV !== 'production') {
  require('./config.js');
}

import fs from 'fs';
var path      = require("path");
var Sequelize = require("sequelize");

var sequelize = new Sequelize(process.env.POSTGRES_URI);

// Change to true to update the model in the database.
// NOTE: This will erase your data.
sequelize.sync({force: false});


var User = sequelize.define('User', {
  username: { 
    type: Sequelize.STRING, 
    unique: true, 
    allowNull: false,
    validate: {
      isLowercase: true,
    },
  },
  name: { type: Sequelize.STRING, allowNull: false},
  image: { type: Sequelize.STRING, allowNull: false},
});

var Link = sequelize.define('Link', {
  title: { type: Sequelize.STRING, allowNull: false},
  url: { type: Sequelize.STRING, allowNull: false},
});

var Follow = sequelize.define('Follow', {
    lastRead: Sequelize.BOOLEAN
})

Link.belongsTo(User, {
  onDelete: "CASCADE",
  foreignKey: {
    allowNull: false
  }
});
User.hasMany(Link);
User.belongsToMany(User, { onDelete: "CASCADE", as: 'followers', through: 'Follow', foreignKey: 'follower' })
User.belongsToMany(User, { onDelete: "CASCADE", as: 'following', through: 'Follow', foreignKey: 'followee' })


const db = {
  User: User,
  Link: Link,
  Follow: Follow,
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;