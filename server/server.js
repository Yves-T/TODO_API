require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const { to } = require('await-to-js');
const { ObjectID } = require('mongodb');
const { isBoolean, pick } = require('lodash');

const { mongoose } = require('./db/mongoose');
const { Todo } = require('./models/todo');
const { User } = require('./models/user');
const { authenticate } = require('./middleware');

const app = express();
app.use(bodyParser.json());
app.post('/todos', async (req, res) => {
  const todo = new Todo({ text: req.body.text });
  const [err, success] = await to(todo.save());
  if (err) {
    res.status(400).send(err);
  } else {
    res.send(success);
  }
});

app.get('/todos', async (req, res) => {
  const [err, todos] = await to(Todo.find({}));
  if (err) {
    res.status(400).send(err);
  } else {
    res.send({ todos });
  }
});

app.get('/todos/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }
  const [err, someTodo] = await to(Todo.findById(id));
  if (err) {
    return res.status(400).send();
  }

  if (!someTodo) {
    res.status(400).send();
  }

  return res.send({ todo: someTodo });
});

app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  const [err, removedTodo] = await to(Todo.findByIdAndRemove(id));
  if (err) {
    return res.status(400).send();
  }

  if (!removedTodo) {
    return res.status(404).send();
  }

  return res.send({ todo: removedTodo });
});

app.patch('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const body = pick(req.body, ['text', 'completed']);

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  if (isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  const [someError, updatedTodo] = await to(
    Todo.findByIdAndUpdate(id, { $set: body }, { new: true })
  );

  if (someError) {
    return res.status(400).send();
  }

  if (!updatedTodo) {
    return res.status(404).send();
  }

  return res.send({ todo: updatedTodo });
});

app.post('/users', async (req, res) => {
  const body = pick(req.body, ['email', 'password']);
  const user = new User(body);
  const [err] = await to(user.save());
  if (err) {
    res.status(400).send(err);
  } else {
    const [tokenErr, token] = await to(user.generateAuthToken());
    if (tokenErr) {
      res.status(400).send({ tokenErr });
    } else {
      res.header('x-auth', token).send(user);
    }
  }
});

app.get('/users/me', authenticate, async (req, res) => {
  res.send(req.user);
});

// eslint-disable-next-line no-console
app.listen(3000, () => console.log('started on port 3000 '));

module.exports.app = app;
