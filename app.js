/// Core Object
var cc = {};
/// Core Networking
var express = require('express');
var app = express();
var server = require('http').Server(app);
/// Express Middleware
var session = require('express-session');
var bodyParser = require('body-parser');
/// NEDB
var Datastore = require('nedb'), db = new Datastore({ filename: 'app.db', autoload: true });
db.persistence.setAutocompactionInterval(1000 * 60);


/// Middleware Config
// Configure Session
app.use(session({
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
  secret: 'rainbowdash'
}));
// Post Handlers
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded({ extended: true }) ); // to support URL-encoded bodies
// Render Engine
app.set('view engine', 'jade')
app.set('views', __dirname + '/views/')
app.engine('jade', require('jade').__express);

app.get('/', function(req, res, next){
  if(!req.session.user) req.session.user = {};
  res.render('index', {session:req.session.user});
});

/// General Function
cc.tryLogin = function(username, password, req, callback){
  var errors = [];
  if(!username) errors.push("Username Required");
  if(!password) errors.push("Password Required");
  if(errors.length > 0){
    if(callback)callback({
      success:false,
      errors:errors
    });
    return;
  }

  // Add this to trylogin
  db.findOne({ username: username, password:password }, function (err, doc) {
    if(!doc){
      if(callback)callback({
        success:false,
        errors:["Username or Password Incorrect"]
      });
      return;
    }
    cc.forceLogin(username, req, callback);
    return;
  });
}

cc.forceLogin = function(username, req, callback){
  db.findOne({ username: username }, function (err, doc) {
    req.session.user = doc;
    if(callback)callback({
      success:true
    });
  });
}

cc.register = function(username, password, req, callback){
  var errors = [];
  if(!req.body.username) errors.push("Username Required");
  if(!req.body.password) errors.push("Password Required");
  if(errors.length > 0){
    if(callback)callback({
      success:false,
      errors:errors
    });
    return;
  }

  db.findOne({ username: username }, function (err, doc) {
    if(doc){
      if(callback)callback({
        success:false,
        errors:["Username Taken"]
      });
      return;
    }

    var newUser = {
      username: username,
      password: password,
      registered_on: new Date().getTime()
    }

    db.insert(newUser, function (err, newDoc) {
      if(callback)callback({
        success:true
      });
      console.log("Registered",newUser);
    });
    return;
  });
}

cc.saveUser = function(user){
  db.update({ username: user.username }, user );
}

// Tracking functions
cc.ctrack = {};

cc.ctrack.defaultDailyRate = 1700;

cc.ctrack.getDailyRate = function(user){
  if(!user.dailyRate) user.dailyRate = cc.ctrack.defaultDailyRate;
  return user.dailyRate;
}

cc.ctrack.getMilliRate = function(user){
  var daily = cc.ctrack.getDailyRate(user);
  var hourly = daily / 24;
  var minutely = hourly / 60;
  var secondly = minutely / 60;
  var millily = secondly / 1000;
  return millily;
}

cc.ctrack.getCurrent = function(user){

  // Get time since last check, and update "last" to be now.
  if(!user.lastCheck) user.lastCheck = new Date().getTime();
  var now = new Date().getTime();
  var delta = now - user.lastCheck;
  user.lastCheck = now;
  
  //delta represents the millis passed since the last check. 
  // Take milli rate and multiply.
  var charged = delta * cc.ctrack.getMilliRate(user);
  if(!user.currentCharge) user.currentCharge = 0;
  user.currentCharge += charged;
  value = Math.min(cc.ctrack.getDailyRate(user),user.currentCharge);
  
  // Save
  cc.saveUser(user);
  
  // Return Current after accounting for timechanges.
  return {
    numeric: value,
    fraction: ( value / cc.ctrack.getDailyRate(user) ),
    total: cc.ctrack.getDailyRate(user),
    millirate: cc.ctrack.getMilliRate(user)
  }
}

cc.ctrack.modify = function(user,by){

  var x = cc.ctrack.getCurrent(user);
  x = x.numeric - parseFloat(by);
  user.currentCharge = x;
  cc.saveUser(user);

}

cc.ctrack.set = function(user,to){

  cc.ctrack.getCurrent(user);
  user.currentCharge = parseFloat(to);
  cc.saveUser(user);

}


// LOGIC PAGES
app.post('/login', function(req, res, next){
  // Required
  cc.tryLogin(req.body.username,req.body.password,req,function(result){
    if(req.xhr){
      res.send(result);
      return;
    }
    res.redirect("/");
  }) 
});

app.post('/logout', function(req, res, next){
  // Required
  req.session.destroy();
  res.redirect("/");
});
app.get('/logout', function(req, res, next){
  // Required
  req.session.destroy();
  res.redirect("/");
});

app.post('/register', function(req, res, next){
  // Required
  cc.register(req.body.username,req.body.password,req,function(result){
    if(req.xhr){
      res.send(result);
      return;
    }
    res.redirect("/");
  })
});


app.post('/data', function(req, res, next){
  if(req.session.user) {
    res.send({
      success:true,
      data:cc.ctrack.getCurrent(req.session.user)
    });
    return;
  }
  res.send({
    success:false,
    data:"Not Logged In"
  });
});

app.post('/modify', function(req, res, next){
  if(req.session.user && req.body.spend) {
    cc.ctrack.modify(req.session.user,req.body.spend);
    res.redirect("/");
    return;
  }

  if(req.session.user && req.body.set) {
    cc.ctrack.set(req.session.user,req.body.set);
    res.redirect("/");
    return;
  }
  res.send({
    success:false,
    data:"Not Logged In"
  });
});

/// Static route config
var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['htm', 'html'],
  index: "index.html",
  maxAge: '1d',
  redirect: false,
  setHeaders: function (res, path) {
    res.set('x-timestamp', Date.now())
  }
};

// Static fallback.
app.use("/", express.static(__dirname + '/public/',options));

// Start Server
server.listen(3000);