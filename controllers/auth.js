const express = require('express');

const onlyLoggedIn = require('../lib/only-logged-in'); //ensure this link is correct

module.exports = (dataLoader) => {
  const authController = express.Router();


//THESE METHODS HANDLE THE SERVER-SIDE COMMUNICATION (REQUESTS & RESPONSES)


// Create a new user (SIGNUP)
authController.post('/users', (req, res) => {

  dataLoader.createUser({
    email: req.body.email,
    password: req.body.password
  })
    .then(user => res.status(201).json(user))
    .catch(err => res.status(400).json(err));
});


// Create a new session (LOGIN)
authController.post('/sessions', (req, res) => {

  dataLoader.createTokenFromCredentials(
    req.body.email,
    req.body.password
  )
    .then(token => res.status(201).json({token: token}))
    .catch(err => res.status(401).json({error: "Something went wrong!"}));
});

// Delete a session (LOGOUT)
authController.delete('/sessions', onlyLoggedIn, (req, res) => {

  dataLoader.deleteToken(req.sessionToken)
    .then(() => res.status(204).end())
    .catch(err => res.status(400).json(err));
});


// Retrieve current user

authController.get('/me', onlyLoggedIn, (req, res) => {
  if (req.sessionToken) {
    dataLoader.getUserFromSession(req.sessionToken)
      .then(data => res.json(data))
      .catch(err => res.status(400).json(err));
  } else {
    res.status(401).json({error: 'Invalid session token, try signing in again!'});
  }
});

return authController;
};
