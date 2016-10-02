"use strict";

if (process.env.NODE_ENV !== 'production') {
  require('./config.js');
}

import fs from 'fs';
var path      = require("path");
var Sequelize = require("sequelize");
var passportLocalSequelize = require('passport-local-sequelize');

var sequelize = new Sequelize(process.env.POSTGRES_URI, {logging: false});

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
      isAlphanumeric: true, // No special characters
      is: /^.*[A-Za-z]+.*$/, // Must contain at least one letter
    },
  },
  name: { type: Sequelize.STRING, allowNull: false},
  email: { 
    type: Sequelize.STRING, 
    allowNull: false, 
    unique: true,
    validate: {
      isEmail: true
    } 
  },
  image: { type: Sequelize.STRING, allowNull: false},
  apiToken: Sequelize.STRING,
  hash: Sequelize.TEXT,
  salt: Sequelize.STRING
});

passportLocalSequelize.attachToUser(User, {
    usernameField: 'username',
    hashField: 'hash',
    saltField: 'salt'
});

var Link = sequelize.define('Link', {
  description: { type: Sequelize.TEXT, allowNull: false},
  url: { 
    type: Sequelize.TEXT, 
    allowNull: false,
    validate: {
      isUrl: true,
    },
  },
});

var Follow = sequelize.define('Follow', {
    lastRead: Sequelize.DATE()
})

// Link.belongsTo(User, {
//   as: 'links',
//   onDelete: "CASCADE",
//   foreignKey: { allowNull: false }
// });
User.hasMany(Link, {as: 'links', onDelete: "CASCADE", foreignKey: { allowNull: false } });
User.belongsToMany(User, { onDelete: "CASCADE", as: 'following', through: 'Follow', foreignKey: 'follower' })
User.belongsToMany(User, { onDelete: "CASCADE", as: 'followers', through: 'Follow', foreignKey: 'followee' })


const db = {
  User: User,
  Link: Link,
  Follow: Follow,
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;