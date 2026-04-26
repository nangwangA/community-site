const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', authMiddleware, userController.logout);

router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/password', authMiddleware, userController.changePassword);
router.get('/my/articles', authMiddleware, userController.getMyArticles);
router.get('/my/comments', authMiddleware, userController.getMyComments);
router.delete('/my/comments/:id', authMiddleware, userController.deleteMyComment);
router.get('/my/favorites', authMiddleware, userController.getMyFavorites);

module.exports = router;
