const mongoose = require('mongoose');

const { Schema } = mongoose;

const TokenSchema = new Schema({
  access: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  }
});

module.exports = TokenSchema;
