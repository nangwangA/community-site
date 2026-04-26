const { query, queryOne } = require('../config/db');
const { hasSensitiveWord, filterSensitive } = require('../middleware/validate');

class CommentController {
  async getList(req, res) {
    try {
      const articleId = req.params.article_id;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;
      const offset = (page - 1) * pageSize;
      const comments = await query(
        `SELECT c.id, c.content, c.parent_id, c.reply_to_user_id, c.created_at,
                u.id AS user_id, u.nickname, u.avatar,
                ru.nickname AS reply_to_nickname
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN users ru ON c.reply_to_user_id = ru.id
         WHERE c.article_id = ? AND c.is_deleted = 0 AND c.parent_id = 0
         ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
        [articleId, pageSize, offset]
      );
      const repliesMap = {};
      for (const comment of comments) {
        const replies = await query(
          `SELECT c.id, c.content, c.parent_id, c.reply_to_user_id, c.created_at,
                  u.id AS user_id, u.nickname, u.avatar,
                  ru.nickname AS reply_to_nickname
           FROM comments c
           LEFT JOIN users u ON c.user_id = u.id
           LEFT JOIN users ru ON c.reply_to_user_id = ru.id
           WHERE c.article_id = ? AND c.is_deleted = 0 AND c.parent_id = ?
           ORDER BY c.created_at ASC`,
          [articleId, comment.id]
        );
        repliesMap[comment.id] = replies;
      }
      const countResult = await queryOne(
        'SELECT COUNT(*) as total FROM comments WHERE article_id = ? AND is_deleted = 0',
        [articleId]
      );
      res.json({
        code: 200,
        data: { list: comments, replies: repliesMap, pagination: { page, pageSize, total: countResult.total } }
      });
    } catch (err) {
      console.error('获取评论列表错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async create(req, res) {
    try {
      const { content, parent_id, reply_to_user_id } = req.body;
      const articleId = req.params.article_id;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ code: 400, message: '评论内容不能为空' });
      }
      if (content.length > 500) {
        return res.status(400).json({ code: 400, message: '评论内容不能超过500个字符' });
      }
      if (hasSensitiveWord(content)) {
        return res.status(400).json({ code: 400, message: '评论包含敏感词' });
      }
      const article = await queryOne('SELECT id, status FROM articles WHERE id = ? AND is_deleted = 0', [articleId]);
      if (!article) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      if (parent_id) {
        const parentComment = await queryOne('SELECT id FROM comments WHERE id = ? AND article_id = ? AND is_deleted = 0', [parent_id, articleId]);
        if (!parentComment) {
          return res.status(400).json({ code: 400, message: '被回复的评论不存在' });
        }
      }
      const cleanContent = filterSensitive(content.trim());
      const clientIp = req.ip || req.headers['x-forwarded-for'] || '';
      await query(
        `INSERT INTO comments (article_id, user_id, parent_id, reply_to_user_id, content, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [articleId, req.user.id, parent_id || 0, reply_to_user_id || null, cleanContent, clientIp]
      );
      await query('UPDATE articles SET comment_count = comment_count + 1 WHERE id = ?', [articleId]);
      res.json({ code: 200, message: '评论成功' });
    } catch (err) {
      console.error('发表评论错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async delete(req, res) {
    try {
      const commentId = req.params.id;
      const comment = await queryOne(
        'SELECT * FROM comments WHERE id = ? AND is_deleted = 0',
        [commentId]
      );
      if (!comment) {
        return res.status(404).json({ code: 404, message: '评论不存在' });
      }
      const isAuthor = comment.user_id === req.user.id;
      const article = await queryOne('SELECT user_id FROM articles WHERE id = ?', [comment.article_id]);
      const isArticleOwner = article && article.user_id === req.user.id;
      const isAdmin = req.user.role === 1;
      if (!isAuthor && !isArticleOwner && !isAdmin) {
        return res.status(403).json({ code: 403, message: '无权删除此评论' });
      }
      await query('UPDATE comments SET is_deleted = 1 WHERE id = ?', [commentId]);
      await query('UPDATE articles SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?', [comment.article_id]);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      console.error('删除评论错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async deleteByAdmin(req, res) {
    try {
      const comment = await queryOne('SELECT * FROM comments WHERE id = ? AND is_deleted = 0', [req.params.id]);
      if (!comment) {
        return res.status(404).json({ code: 404, message: '评论不存在' });
      }
      await query('UPDATE comments SET is_deleted = 1 WHERE id = ?', [req.params.id]);
      await query('UPDATE articles SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?', [comment.article_id]);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      console.error('管理员删除评论错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
}

module.exports = new CommentController();
