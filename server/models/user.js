const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { pick } = require('lodash');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const { to } = require('await-to-js');

const genSaltAsync = promisify(bcrypt.genSalt);
const hashAsync = promisify(bcrypt.hash);
const compareAsync = promisify(bcrypt.compare);

const TokenSchema = require('./token');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    minLength: 1,
    unique: true,
    validate: [
      {
        validator: value => validator.isEmail(value),
        msg: 'Invalid Email Address'
      }
    ]
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  },
  tokens: [TokenSchema]
});

UserSchema.methods.generateAuthToken = async function() {
  const user = this;
  const access = 'auth';
  const token = jwt
    .sign({ _id: user._id.toHexString(), access }, process.env.JWT_SECRET)
    .toString();
  await user.update({ $push: { tokens: { access, token } } });

  return token;
};

UserSchema.methods.removeToken = function(token) {
  const user = this;
  return user.update({
    $pull: {
      tokens: {
        token
      }
    }
  });
};

UserSchema.methods.toJSON = function() {
  const user = this;
  const userObject = user.toObject();

  return pick(userObject, ['_id', 'email']);
};

UserSchema.statics.findByToken = function(token) {
  const User = this;
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return Promise.reject(err);
  }

  return User.findOne({
    _id: decoded._id,
    'tokens.token': token,
    'tokens.access': 'auth'
  });
};

UserSchema.pre('save', async function(next) {
  const user = this;
  if (user.isModified('password')) {
    let err = null;
    let salt = null;
    let hash = null;
    [err, salt] = await to(genSaltAsync(parseInt(process.env.SALT_ROUNDS, 10)));
    [err, hash] = await to(hashAsync(user.password, salt));
    user.password = hash;
  }
  next();
});

UserSchema.statics.findByCredentials = async function(email, password) {
  const User = this;
  let user = null;
  let err = null;
  let compareResult = null;

  [err, user] = await to(User.findOne({ email }));
  if (user) {
    [err, compareResult] = await to(compareAsync(password, user.password));
    return compareResult ? user : false;
  }
  return false;
};

const User = mongoose.model('User', UserSchema);

module.exports = {
  User
};
