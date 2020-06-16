const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const path = require('path');
const cookieParser = require('cookie-parser');

//Load environment variables
dotenv.config({ path: './config/config.env' });

//Connect to Database
connectDB();

//Import Router Files
const authTrainer = require('./routes/authTrainer');
const authClient = require('./routes/authClient');
const exercise = require('./routes/exercise');

//Init app
const app = express();

//Dev Logger middleware - Morgan
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Set static folder public
app.use(express.static(path.join(__dirname, 'public')));

//Body Parser middleware
app.use(express.json());

//Cookie-Parser middleware
app.use(cookieParser());

//File upload middleware
app.use(fileupload());

//Routes Middleware
app.use('/api/v1/trainer/auth', authTrainer);
app.use('/api/v1/client/auth', authClient);
app.use('/api/v1/trainer/exercises', exercise);

//Error Middleware
app.use(errorHandler);

//Set PORT & Env
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV;

//Start server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`.yellow.bold);
});

//Handle unhandled promise rejections & exit the app
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  //Close server & exit process
  server.close(() => process.exit(1));
});
