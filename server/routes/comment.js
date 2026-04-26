const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authMiddleware } = require('../middleware/auth');

router.get('/article/:article_id', commentController.getList);
router.get('/', (req, res) => {
  const article_id = req.query.article_id;
  if (!article_id) {
    return res.status(400).json({ code: 400, message: '缺少文章ID' });
  }
  res.redirect(`/api/comments/article/${article_id}${req.url.includes('?') ? '&' + req.url.split('?')[1] : ''}`);
});
router.post('/article/:article_id', authMiddleware, commentController.create);
router.post('/', (req, res) => {
  const article_id = req.body.article_id;
  if (!article_id) {
    return res.status(400).json({ code: 400, message: '缺少文章ID' });
  }
  res.redirect(307, `/api/comments/article/${article_id}`);
});
router.delete('/:id', authMiddleware, commentController.delete);

module.exports = router;
