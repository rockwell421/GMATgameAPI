//All methods associated with the GMAX Logic Training Game

const bcrypt = require('bcrypt-as-promised');
const knex = require('knex')({ client: 'mysql' });
const validate = require('./validations');
const util = require('./util');
const md5 = require('js-md5');

const HASH_ROUNDS = 10;
const USER_FIELDS = ['id', 'email', 'createdAt', 'updatedAt'];
const QUESTION_FIELDS = ['id','question', 'answerA', 'answerB', 'answerC', 'answerD', 'answerE', 'category', 'level', 'correctAnswer'];
//more constants fields go in here


//Dataloader class

class gmaxDataLoader {
  constructor(conn) {
    this.conn = conn;
  }
  query(sql) {
    return this.conn.query(sql);
  }

  // AUTH ONE OK SIGNUP
  // User methods

  createUser(userData) {
    const errors = validate.user(userData);
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    return bcrypt.hash(userData.password, HASH_ROUNDS)
      .then((hashedPassword) => {
        return this.query(
          knex
            .insert({
              email: userData.email,
              password: hashedPassword
            })
            .into('users')
            .toString()
        );
      })
      .then((result) => {
        return this.query(
          knex
            .select(USER_FIELDS)
            .from('users')
            .where('id', result.insertId)
            .toString()
        );
      })
      .then(result => result[0])
      .catch((error) => {

        // Special error handling for duplicate entry
        if (error.code === 'ER_DUP_ENTRY') {
          throw new Error('A user with this email already exists');
        } else {
          throw error;
        }
      });
  }

//This method deletes the user (extra feature)
  deleteUser(userId) {
    return this.query(
      knex.delete().from('users').where('id', userId).toString()
    );
  }

  //Authorization: RETRIEVE CURRENT USER

  getUserFromSession(sessionToken) {
    return this.query(
      knex

       .select('users.id as id', 'users.email as email', 'users.createdAt as createdAt', 'users.updatedAt as updatedAt')
        .from('sessions')
        .join('users', 'sessions.userId', '=', 'users.id')
        .where({
          'sessions.token': sessionToken
        })
        .toString()
    )
      .then((result) => {

        if (result.length === 1) {

          /*
          added avatarURL property to user object returned by query, this method hashes
          the email address and returns a Gravatar image url to the auth/me
          */
          result[0].avatarUrl = 'https://www.gravatar.com/avatar/' + md5(result[0].email.toLowerCase()) + '?d=identicon';
          return result[0];
        }
        return null;
      });
  }


  // AUTHORIZATION: LOGIN METHOD

  createTokenFromCredentials(email, password) {
    const errors = validate.credentials({
      email: email,
      password: password
    });
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    let sessionToken;
    let user;
    return this.query(
      knex
        .select('id', 'password')
        .from('users')
        .where('email', email)
        .toString()
    )
      .then((results) => {
        if (results.length === 1) {
          user = results[0];
          return bcrypt.compare(password, user.password).catch(() => false);
        }

        return false;
      })
      .then((result) => {
        if (result === true) {
          return util.getRandomToken();
        }

        throw new Error('Username or password invalid');
      })
      .then((token) => {
        sessionToken = token;
        return this.query(
          knex
            .insert({
              userId: user.id,
              token: sessionToken
            })
            .into('sessions')
            .toString()
        );
      })
      .then(() => sessionToken);
  }


  // LOGOUT (DELETE SESSION) AUTH 3
  deleteToken(token) {
    return this.query(
      knex
        .delete()
        .from('sessions')
        .where('token', token)
        .toString()
    )
      .then(() => true);
  }

//add getQuestion query method here

  getQuestion(questionId) {
    return this.query(
      knex
      .select('QUESTION_FIELDS')
        .from('questions')
        .where({
          'questions.id': questionId
        })
        .toString()
      )
    )
  }


  /*
  METHODS TO ADD

gameEngine class

  1. gameStart: kicks off the game when the user hits the begin button
  2. updateScore: update user score
  3. getCategory: fetches question category every time a new question loads
  4. getQuestion: fetches data from the questions table:
  selects question, correct answer, associated images, category, difficulty, explanation (renders if user gets the question wrong).

--> for getQuestion, we can select the queries but if we want to render them into different components, how do we set it up? Do we create separate methods to display each box?

  Extras***

TBD

  */
