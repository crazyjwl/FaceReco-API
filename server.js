const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }
})

db.select('*').from('users').then(data => {
  //console.log(data);
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('it is working');
})

app.post('/signin', (req, res) =>{
  // bcrypt.compare("apples", '$2a$10$621R05Vn5OUjEFYkVrPoaOq//h5Bn5ngAMwiSUwnbX9Nl9k3oNtNq', function(err, res) {
  //   console.log('first guess', res);
  // });
  // bcrypt.compare("veggies", '$2a$10$621R05Vn5OUjEFYkVrPoaOq//h5Bn5ngAMwiSUwnbX9Nl9k3oNtNq', function(err, res) {
  //   console.log('second guess', res);
  // });

  db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', req.body.email)
          .then(user => {
            console.log(user);
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('wrong password')
      }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

app.post('/signup', (req, res) => {
  const {email, name, password} = req.body;
  // bcrypt.hash(password, null, null, function(err, hash) {
  //   console.log(hash);
  // });
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email:email
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
          .returning('*')
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json(user[0]);
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to join'))

})

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user =>{
      if (user.length !== 0) {
        res.json(user[0]);
      } else {
        res.status(400).json('not found');
      }
    })
    .catch(err => res.status(400).json('no such user'))
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entires => {
      res.json(entires[0]);
    })
    .catch(err => res.status(400).json('unable to get entries'))
})

app.listen(process.env.PORT ||3000, () => {
  console.log(`app is running on port ${process.env.PORT}`);
});

/*
  / --> res = this is working
  /signin --> POST  success/fail
  /signup --> POST = user
  /profile/:userID --> GET = userID
  /image --> PUT --> user
*/
