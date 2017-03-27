var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');

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
  var suren = new User({
    name: 'Surender',
    password: 'password',
    admin: true
  });

  suren.save(function(err) {
    if(err) throw err;

    console.log('User Saved Successfully');
    res.json({success: true});
  })
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
      if(user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed. Wrong password.' });
      } else {
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresIn : 60*60*24
        });

        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        })
      }
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

apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    if(err) throw err;

    res.json(users);
  })
});

app.use('/api', apiRoutes);


app.listen(port);
console.log('Magic happens at http://localhost:' + port);

