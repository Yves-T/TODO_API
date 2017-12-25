const { User } = require('./../models/user');
const { to } = require('await-to-js');

const authenticate = async (req, res, next) => {
  const token = req.header('x-auth');

  const [err, user] = await to(User.findByToken(token));
  if (err || !user) {
    return res.status(401).send();
  }
  req.user = user;
  req.token = token;
  next();
  return user;
};

module.exports = { authenticate };
