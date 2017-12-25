const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { pick } = require('lodash');

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
    require: true,
    minLength: 6
  },
  tokens: [TokenSchema]
});

UserSchema.methods.generateAuthToken = async function() {
  const user = this;
  const access = 'auth';
  const token = jwt
    .sign({ _id: user._id.toHexString(), access }, 'abc123')
    .toString();
  await user.update({ $push: { tokens: { access, token } } });

  return token;
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
    decoded = jwt.verify(token, 'abc123');
  } catch (err) {
    return Promise.reject(err);
  }

  return User.findOne({
    _id: decoded._id,
    'tokens.token': token,
    'tokens.access': 'auth'
  });
};

const User = mongoose.model('User', UserSchema);

module.exports = {
  User
};
