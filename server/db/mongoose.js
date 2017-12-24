const mongoose = require('mongoose');

mongoose.Promise = global.Promise; // Tell Mongoose to use ES6 promises
mongoose.connect(process.env.MONGO_URI, {
  useMongoClient: true
});

module.exports = { mongoose };
