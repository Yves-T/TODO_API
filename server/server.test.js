const chai = require('chai');
const dirtyChai = require('dirty-chai');
const request = require('supertest');
const { to } = require('await-to-js');
const { ObjectID } = require('mongodb');

const { Todo } = require('../server/models/todo');
const { app } = require('../server/server');

chai.use(dirtyChai);
const { expect } = chai;

const todos = [
  {
    text: 'First test todo',
    _id: new ObjectID()
  },
  {
    text: 'Second test todo',
    _id: new ObjectID(),
    completed: true,
    completedAt: 123
  }
];

beforeEach(async () => {
  await Todo.remove({});
  await Todo.insertMany(todos);
});

describe('POST /todos', () => {
  it('should create a new todo ', done => {
    const text = 'Test todo text';

    request(app)
      .post('/todos')
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
        } catch (someError) {
          return done(someError);
        }

        return done();
      });
  });
});

describe('GET /todos', () => {
  it('should get all todos', done => {
    request(app)
      .get('/todos')
      .expect(200)
      .expect(res => expect(res.body.todos).to.have.length(2))
      .end(done);
  });
});

describe('DELETE /todos/:id', () => {
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

describe('PATCH /todos/:id', () => {
  it('should update the todo', done => {
    const hexId = todos[0]._id.toHexString();
    const text = 'This should be the new text';
    request(app)
      .patch(`/todos/${hexId}`)
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

  it('should clear completedAt when todo is not completed', done => {
    const hexId = todos[1]._id.toHexString();
    const text = 'This should be the new text!!!';
    request(app)
      .patch(`/todos/${hexId}`)
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
