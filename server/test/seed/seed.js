const { ObjectID } = require('mongodb');
const jwt = require('jsonwebtoken');
const { Todo } = require('./../../models/todo');
const { User } = require('./../../models/user');

const userOneId = new ObjectID();
const userTwoId = new ObjectID();
const users = [
  {
    _id: userOneId,
    email: 'andrew@example.com',
    password: 'userOnePass',
    tokens: [
      {
        access: 'auth',
        token: jwt
          .sign({ _id: userOneId, access: 'auth' }, process.env.JWT_SECRET)
          .toString()
      }
    ]
  },
  {
    _id: userTwoId,
    email: 'jen@example.com',
    password: 'userTwoPass',
    tokens: [
      {
        access: 'auth',
        token: jwt
          .sign({ _id: userTwoId, access: 'auth' }, process.env.JWT_SECRET)
          .toString()
      }
    ]
  }
];

const todos = [
  {
    _id: new ObjectID(),
    text: 'First test todo',
    _creator: userOneId
  },
  {
    _id: new ObjectID(),
    text: 'Second test todo',
    completed: true,
    completedAt: 333,
    _creator: userTwoId
  }
];

const populate = done => {
  User.remove({})
    .then(() => Todo.remove({}))
    .then(() => {
      const manyTodos = Todo.insertMany(todos);
      const userOne = new User(users[0]).save();
      const userTwo = new User(users[1]).save();
      Promise.all([manyTodos, userOne, userTwo]).then(() => done());
    });
};

module.exports = {
  todos,
  users,
  populate
};
