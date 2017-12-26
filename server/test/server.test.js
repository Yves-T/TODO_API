const chai = require('chai');
const dirtyChai = require('dirty-chai');
const request = require('supertest');
const { to } = require('await-to-js');
const { ObjectID } = require('mongodb');
const jwt = require('jsonwebtoken');

const { Todo } = require('../models/todo');
const { User } = require('../models/user');
const { app } = require('../server');
const { todos, populate, users } = require('./seed/seed');

chai.use(dirtyChai);
const { expect } = chai;

beforeEach(populate);

describe('POST /todos', function() {
  this.timeout(5000);
  it('should create a new todo ', done => {
    const text = 'Test todo text';

    request(app)
      .post('/todos')
      .set('x-auth', users[0].tokens[0].token)
      .send({ text })
      .expect(200)
      .expect(res => {
        expect(res.body.text).to.equal(text);
      })
      .end(async (err, res) => {
        if (err) {
          done(err);
        }

        const foundTodos = await Todo.find({ text });
        try {
          expect(foundTodos).to.have.length(1);
          expect(foundTodos[0]).property('text', text);
          return done();
        } catch (someError) {
          return done(someError);
        }
      });
  });
});

describe('GET /todos', function() {
  this.timeout(5000);
  it('should get all todos', done => {
    request(app)
      .get('/todos')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect(res => expect(res.body.todos).to.have.length(1))
      .end(done);
  });
});

describe('GET /todos/:id', () => {
  it('should not return todo doc created by another user', done => {
    request(app)
      .get(`/todos/${todos[1]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(404)
      .end(done);
  });

  it('should return todo doc created by another user', done => {
    request(app)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).to.equal(todos[0].text);
      })
      .end(done);
  });
});

describe('DELETE /todos/:id', function() {
  this.timeout(5000);
  it('should remove a todo', done => {
    const hexId = todos[1]._id.toHexString();

    request(app)
      .delete(`/todos/${hexId}`)
      .expect(200)
      .expect(res => {
        expect(res.body.todo._id).to.equal(hexId);
      })
      .end(async err => {
        if (err) {
          return done(err);
        }

        const [someError, foundTodo] = await to(Todo.findById(hexId));
        if (someError) {
          return done(err);
        }
        expect(foundTodo).to.not.exist();
        return done();
      });
  });

  it('should return 404 if todo not found', done => {
    const hexId = new ObjectID().toHexString();
    request(app)
      .delete(`/todos/${hexId}`)
      .expect(404)
      .end(done);
  });

  it('should return 404 if object id is invalid', done => {
    request(app)
      .delete(`/todos/123abc`)
      .expect(404)
      .end(done);
  });
});

describe('PATCH /todos/:id', function() {
  this.timeout(5000);
  it('should update the todo', done => {
    const hexId = todos[0]._id.toHexString();
    const text = 'This should be the new text';
    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[0].tokens[0].token)
      .send({
        completed: true,
        text
      })
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).to.equal(text);
        expect(res.body.todo.completed).to.be.true();
        expect(res.body.todo.completedAt).to.be.a('number');
      })
      .end(done);
  });

  it('should not update the todo created by another user', done => {
    const hexId = todos[0]._id.toHexString();
    const text = 'This should be the new text';
    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .send({
        completed: true,
        text
      })
      .expect(404)
      .end(done);
  });

  it('should clear completedAt when todo is not completed', done => {
    const hexId = todos[1]._id.toHexString();
    const text = 'This should be the new text!!!';
    request(app)
      .patch(`/todos/${hexId}`)
      .set('x-auth', users[1].tokens[0].token)
      .send({
        completed: false,
        text
      })
      .expect(200)
      .expect(res => {
        expect(res.body.todo.text).to.equal(text);
        expect(res.body.todo.completed).to.be.false();
        expect(res.body.todo.completedAt).to.be.a('null');
      })
      .end(done);
  });
});

describe('GET /users/me', () => {
  it('should return user if authenticated', done => {
    request(app)
      .get('/users/me')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect(res => {
        expect(res.body._id).to.equal(users[0]._id.toHexString());
        expect(res.body.email).to.equal(users[0].email);
      })
      .end(done);
  });

  it('should return 404 if not authenticated', done => {
    request(app)
      .get('/users/me')
      .expect(401)
      .expect(res => {
        expect(res.body).to.deep.equal({});
      })
      .end(done);
  });
});

describe('POST /users', () => {
  it('should create a user', done => {
    const email = 'example@example.com';
    const password = '123ndf';
    request(app)
      .post('/users')
      .send({ email, password })
      .expect(200)
      .expect(res => {
        expect(res.headers['x-auth']).to.exist();
        expect(res.body._id).to.exist();
      })
      .end(err => {
        if (err) {
          return done(err);
        }
        User.findOne({ email }).then(user => {
          expect(user).to.exist();
          expect(user.password).to.not.equal(password);
          done();
        });
      });
  });

  it('should return validation errors', done => {
    request(app)
      .post('/users')
      .send({ email: 'and', password: '123' })
      .expect(400)
      .end(done);
  });

  it('should not create user if email in use', done => {
    request(app)
      .post('/users')
      .send({ email: users[0].email, password: 'Password123!' })
      .expect(400)
      .end(done);
  });
});

describe('POST /users/login', () => {
  it('should login user and return auth token', done => {
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: users[1].password
      })
      .expect(200)
      .expect(res => {
        expect(res.headers['x-auth']).to.exist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        return User.findById(users[1]._id)
          .then(user => {
            expect(user.tokens[0]).property('access', 'auth');
            const tokenPayload = jwt.verify(
              user.tokens[0].token,
              process.env.JWT_SECRET
            );
            expect(tokenPayload._id).to.equal(user._id.toHexString());
            expect(tokenPayload.access).to.equal('auth');
            done();
          })
          .catch(e => done(e));
      });
  });
  it('should reejct invalid login', done => {
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: 'somethingNotValid'
      })
      .expect(400)
      .expect(res => {
        expect(res.headers['x-auth']).to.not.exist();
      })
      .end(done);
  });
});

describe('DELETE /users/me/token', () => {
  it('should remove auth token on logout', done => {
    request(app)
      .delete('/users/me/token')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(users[0]._id)
          .then(user => {
            expect(user.tokens).to.have.length(0);
            done();
          })
          .catch(e => done(e));
      });
  });
});
