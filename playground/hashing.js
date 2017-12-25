const { SHA256 } = require('crypto-js');
const jwt = require('jsonwebtoken');

// ==================================================
// principle JWT token without jsonwebtoken library
// ==================================================
const message = 'I am user number 3';
const hash = SHA256(message).toString();
console.log(`Message: ${message}`);
console.log(`Message: ${hash}`);

let data = {
  id: 4
};

let salt = 'someSecret';

const token = {
  data,
  hash: SHA256(`${JSON.stringify(data)}${salt}`).toString()
};

const resultHash = SHA256(`${JSON.stringify(token.data)}${salt}`).toString();

// uncomment 2 lines below to simulate man in the middle attack
// token.data.id = 5;
// token.hash = SHA256(JSON.stringify(token.data)).toString();

if (resultHash === token.hash) {
  console.log('Data was not changed');
} else {
  console.log('Data was changed. Do not trush.');
}

// ===============================================
// principle JWT token with jsonwebtoken library
// ===============================================

data = {
  id: 10
};
salt = 'someOtherSecret';

const jwtToken = jwt.sign(data, salt);
console.log('token:', jwtToken);

// console.log(typeof jwtToken);
// console.log(typeof salt);
const decoded = jwt.verify(jwtToken, salt);
console.log('decoded:', decoded);
