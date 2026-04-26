const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', adminController.getDashboard);
router.get('/articles', adminController.getArticleList);
router.delete('/articles/:id', adminController.deleteArticle);
router.put('/articles/:id/status', adminController.toggleArticleStatus);
router.put('/articles/:id/review', adminController.reviewArticle);
router.get('/comments', adminController.getCommentList);
router.delete('/comments/:id', adminController.deleteComment);
router.get('/users', adminController.getUserList);
router.put('/users/:id/status', adminController.toggleUserStatus);

module.exports = router;
