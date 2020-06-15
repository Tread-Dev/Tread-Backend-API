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
} = require('../controllers/authClient');

//Auth Protect Middleware
const { protect } = require('../middleware/authClient');

//Create route
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);

router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

//Route /api/v1/client/:id/photo
router.route('/:id/photo').put(protect, clientPhotoUpload);

module.exports = router;
