var express = require('express');
var router = express.Router();
const mysql2 = require('mysql2')
const mysql = require('mysql');
var models = require('../models');
var authService = require('../services/auth');
const { post } = require('./users');

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Password1!',
  database: 'marketsquared'
});

connection.connect(function (err) {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Yay! You are connected to the database!');
})

/* GET home page. */
// router.get('/profile', function (req, res, next) {
//   models.users.findOne().then(user => {
//     res.json(user)
//   })
// });

/*Pulls specific user UNTESTED
router.get('/profile/:id', function (req, res, next) {
   models.users.findOne({where: {
    user_id: req.params.user_id
  }}).then(user => {
    res.json(user)
  })
});
*/

router.get('/profile/:id', function (req, res, next) {
  models.users.findByPk(parseInt(req.params.id))
    .then(user => {
      res.json(user)
    })
});

router.get('/profile', function (req, res, next) {
  let token = req.cookies.jwt;
  if (token) {
    authService.verifyUser(token).then(user => {
      if (user) {
        models.users.findOne({
          where: {
            username: user.username
          }
        }).then(user => {
          // console.log(userpostsFound)
          res.json(user);
        });
      }
    });
  } else {
    res.status(401);
    res.send('Must be logged in');
  }
});

// Update User
router.put("/profile/:id", function (req, res, next) {
  let userId = parseInt(req.params.id);
  models.users
    .update(req.body, { where: { user_id: userId } })
    .then(result => res.redirect('/profile/' + userId))
    .catch(err => {
      res.status(400);
      res.send("There was a problem updating the user.  Please check the user information.");
    });
});

// Login user and return JWT as cookie
router.post('/login', function (req, res, next) {
  models.users.findOne({
    where: {
      username: req.body.username
    }
  }).then(user => {
    if (!user) {
      //  console.log('User not found')
      return res.status(401).json({
        message: "User Login Failed"
      });
    } else {
      let passwordMatch = authService.comparePasswords(req.body.password, user.password);
      if (passwordMatch) {
        let token = authService.signUser(user); // <--- Uses the authService to create jwt token
        //res.cookie('jwt', token); // <--- Adds token to response as a cookie
        res.json({ token: token });
      } else {
        // console.log('Wrong password');
        res.json('Wrong password');
      }
    }
  });
});


// Creates a New User
router.post('/', function (req, res, next) {
  models.users
    .findOrCreate({
      where: {
        username: req.body.username
      },
      defaults: {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: authService.hashPassword(req.body.password),
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zip_code: req.body.zip_code,
      }
    })
    .spread(function (result, created) {
      if (created) {
        //never do redirect - needs all to be in frontend SEND JSON EVERYTIME
        res.json('User successfully created');
      } else {
        res.json('This user already exists');
      }
    });
});

//Create Post Works! Needs user asscociations to append user id properly
router.post('/create', function (req, res, next) {
  //let token = req.cookies.jwt;
  // models.user
  // authService.verifyUser(token).then(user => {
  // if (post) {
  models.posts
    .findOrCreate({
      where: {
        // user_id: user.UserId,
        user_id: req.body.UserId,
        title: req.body.PostTitle,
        description: req.body.Description,
        price: req.body.Price,
        category: req.body.Category
      }
    })
    .spread(function (result, created) {
      if (created) {
        res.send('created');
      } else {
        res.send('Error. Post not created');
      }
    });
  //   }});
}
);

router.get('/myposts', function (req, res, next) {
  let token = req.cookies.jwt;
  if (token) {
    authService.verifyUser(token).then(user => {
      if (user) {
        models.posts
          .findAll({
            where: { user_id: user.user_id }
          })
          .then(post => res.json({ post }));
      } else {
        res.status(401);
        res.send("Invalid authentication token");
      }
    });
  } else {
    res.status(401);
    res.send('Must be logged in');
  }
});



router.get('/logout', function (req, res, next) {
  res.cookie('jwt', "", { expires: new Date(0) });
  res.send('Logout Succeeded');
});

module.exports = router;
