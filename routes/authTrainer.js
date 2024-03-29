const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  trainerPhotoUpload,
  addClient,
  getClients,
} = require('../controllers/authTrainer');

//Auth Protect Middleware
const { protect } = require('../middleware/authTrainer');

const advancedResults = require('../middleware/advancedResults');

const Client = require('../models/Client');

//Create route
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

//Route /api/v1/trainer/photo
router.route('/photo').put(protect, trainerPhotoUpload);

//Route /api/v1/trainer/addclient
router.route('/addclient').post(protect, addClient);

//Route /api/v1/trainer/getclients
router
  .route('/getclients')
  .get(protect, advancedResults(Client, 'clients'), getClients);

//Route /api/v1/trainer/assignworkout/:clientID
// router.route('/assignworkout/:clientID').put(protect, assignWorkout);

module.exports = router;
