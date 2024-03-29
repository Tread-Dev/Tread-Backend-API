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
  clientPhotoUpload,
  getWorkouts,
} = require('../controllers/authClient');

//Auth Protect Middleware
const { protect } = require('../middleware/authClient');

//Create route
//Register will be a put because when a trainer adds a client, a profile already gets added to Client DB. On client login we just update the DB.
router.put('/register/:clientID', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

//Route /api/v1/client/auth/photo
router.route('/photo').put(protect, clientPhotoUpload);

//Route /api/v1/client/auth/workouts
router.route('/workouts').get(protect, getWorkouts);

module.exports = router;
