var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var bcrypt = require('bcrypt');

var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); 
var User   = require('./models/user');

// config
var port = process.env.PORT || 8080;
mongoose.connect(config.database);
app.set('superSecret', config.secret);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// basic route
app.get('/', function(req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

app.get('/setup', function(req, res) {
  bcrypt.hash('password', 5, function( err, bcryptedPassword) {
    var user = new User({
      name: 'admin',
      password: bcryptedPassword,
      admin: true
    });

    user.save(function(err) {
      if(err) throw err;

      console.log('User Saved Successfully');
      res.json({success: true});
    }) 
  });
  
});

// API Routes
var apiRoutes = express.Router();

apiRoutes.post('/authenticate', function(req, res) {
  User.findOne({
    name: req.body.name
  }, function(err, user) {
    if(err) throw err;

    if(!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.' });
    } else if(user) {
      bcrypt.compare(req.body.password, user.password, function(err, doesMatch) {
        if (doesMatch) {
            //log him in
            var token = jwt.sign(user, app.get('superSecret'), {
              expiresIn : 60*60*24
            });

            res.json({
              success: true,
              message: 'Enjoy your token!',
              token: token
            })
        } else{
           //go away
           res.json({ success: false, message: 'Authentication failed. Wrong password.' });
        }
      });
    }
  })
});

// Middleware to verify a token
apiRoutes.use(function(req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  if(token) {
    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoder) {
      if(err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        req.decoder = decoder;
        next();
      }
    })
  } else {
    return res.status(401).send({
      success: false,
      message: 'No Token provided'
    })
  }
});


apiRoutes.get('/', function(req, res) {
  res.json({messaeg: 'Welcome to cool API'});
});

// /api/users/

apiRoutes.route('/users')
  
  // Get users list
  .get(function(req, res) {
    User.find({}, function(err, users) {
      if(err) throw err;

      res.json(users);
    })
  })

  // Creat a new user
  .post(function(req, res) {
    bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
      var user = new User({
        name: req.body.name,
        password: bcryptedPassword,
        admin: req.body.admin || true
      });

      user.save(function(err) {
        if(err) {
          res.send(err)
        }

        res.json({message: 'User Saved Successfully'});
      });
    })
  });

// /users/:user_id

apiRoutes.route('/users/:user_id')

  // Get the user with that Id 
  .get(function(req, res) {
    User.findOne({_id: req.params.user_id}, function(err, user) {
      if(err) throw err

      res.send(user);
    })
  })

  // Update the user with that Id
  .put(function(req, res) {
    User.findOne({_id: req.params.user_id}, function(err, user) {
      if(err) throw err;
      
      user.name = req.body.name;

      user.save(function(error) {
        if (error) {
          res.send({message: 'No Info has been given for udpates'});
        }

        res.send({message: 'User Info updated Successfully'});
      })

    })
  })

  // Delete the user with that Id
  .delete(function(req, res) {
    User.remove({_id: req.params.user_id}, function(err, user) {
      if(err) {
        res.send(err);
      }

      res.json({message: "User Successfully Deleted"});
    })
  });

app.use('/api', apiRoutes);


app.listen(port);
console.log('Magic happens at http://localhost:' + port);

