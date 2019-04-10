// Why we need a env variables?
// => When we are in the production level
//  1) the code must be shared with team members.
//  At that moment, we need to expose keys and values to team members
// In order to prevent the key, we need to store key in node 
//  2) When we need to do development and production at the same time,
//    the key should be changed in terms of development in local pc and production in the server.
//    we can control values in local pc and we can MAKE server host assign value to env variables whish is
//    a standard variable to be used 

// assigning value to "process.env.*" can used in "nodeon.json"

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const session = require('express-session');
const mongoStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');

const flash = require('connect-flash');

const multer = require('multer');

const { get404 } = require('./controllers/error');
const isAuth = require('./middleware/is-auth');
const shopController = require('./controllers/shop');
const User = require('./models/user');
const { mongoKey } = require('./config/key' );

const app = express();
const Mongo_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@firstatlas-drwhc.mongodb.net/shop`;

const store = new mongoStore({
  uri: Mongo_URI,
  collection: 'sessions'
});

const csrfProtection = csrf();
const fileStorage = multer.diskStorage({ 
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-')  + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    
    cb(null, true) // if we want the store the designated file

  } else {

    cb(null, false) // if we do not want to store the designated file
  
  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'))
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({ secret: 'asfasdfsafdsa', resave: false, saveUninitialized: false, store }));
app.use(flash());
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated;
  next();
});

app.use((req, res, next) => {
  if(!req.session.user) {
    return next();
  }

  User.findById(req.session.user._id)
    .then(user => {

      // more secure
      if(!user) {
        return next();
      }

      req.user = user;
      next();

    })
    .catch(e => {

      next(new Error(e));
      
      throw new Error(e);
              
    });
});

app.post('/create-order', isAuth, shopController.postOrder);

app.use(csrfProtection);

app.use((req, res, next) => {
  // to aviod csurf error in "/create-order"
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(get404);

app.use((error, req, res, next) => {
  console.log(error);

  res.status(500).render('500', { 
    pageTitle: 'Server Error', 
    path: '/500',
    isAuthenticated: req.session.isAuthenticated
  });
});

mongoose
  .connect(Mongo_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('Server is up!');
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
