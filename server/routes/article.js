const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.get('/list', articleController.getList);
router.get('/search', articleController.getList);
router.get('/my', authMiddleware, articleController.getMyList);
router.get('/:id', optionalAuth, articleController.getDetail);
router.post('/', authMiddleware, articleController.create);
router.put('/:id', authMiddleware, articleController.update);
router.delete('/:id', authMiddleware, articleController.delete);
router.post('/:id/like', authMiddleware, articleController.toggleLike);
router.post('/:id/favorite', authMiddleware, articleController.toggleFavorite);

module.exports = router;
