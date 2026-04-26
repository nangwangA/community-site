const { query, queryOne } = require('../config/db');

class AdminController {
  async getDashboard(req, res) {
    try {
      const stats = await queryOne(
        `SELECT
          (SELECT COUNT(*) FROM users WHERE status = 1) AS user_count,
          (SELECT COUNT(*) FROM articles WHERE is_deleted = 0) AS article_count,
          (SELECT COUNT(*) FROM articles WHERE is_deleted = 0 AND status = 1) AS published_count,
          (SELECT COUNT(*) FROM articles WHERE is_deleted = 0 AND status = 3) AS pending_count,
          (SELECT COUNT(*) FROM comments WHERE is_deleted = 0) AS comment_count`
      );
      res.json({ code: 200, data: stats });
    } catch (err) {
      console.error('获取仪表盘数据错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async getArticleList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const status = req.query.status;
      let whereSql = 'WHERE a.is_deleted = 0';
      let params = [];
      if (status !== undefined && status !== '') {
        whereSql += ' AND a.status = ?';
        params.push(status);
      }
      if (req.query.keyword) {
        whereSql += ' AND a.title LIKE ?';
        params.push(`%${req.query.keyword}%`);
      }
      const list = await query(
        `SELECT a.*, u.nickname AS author_name, c.name AS category_name
         FROM articles a
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN categories c ON a.category_id = c.id
         ${whereSql}
         ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      const countResult = await queryOne(`SELECT COUNT(*) as total FROM articles a ${whereSql}`, params);
      res.json({
        code: 200,
        data: { list, pagination: { page, pageSize, total: countResult.total } }
      });
    } catch (err) {
      console.error('管理员获取文章列表错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async deleteArticle(req, res) {
    try {
      const article = await queryOne('SELECT * FROM articles WHERE id = ? AND is_deleted = 0', [req.params.id]);
      if (!article) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      await query('UPDATE articles SET is_deleted = 1 WHERE id = ?', [req.params.id]);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      console.error('管理员删除文章错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async toggleArticleStatus(req, res) {
    try {
      const article = await queryOne('SELECT * FROM articles WHERE id = ? AND is_deleted = 0', [req.params.id]);
      if (!article) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      const newStatus = article.status === 2 ? 1 : 2;
      await query('UPDATE articles SET status = ? WHERE id = ?', [newStatus, req.params.id]);
      res.json({ code: 200, message: newStatus === 2 ? '已下架' : '已恢复' });
    } catch (err) {
      console.error('切换文章状态错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async reviewArticle(req, res) {
    try {
      const { action } = req.body;
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ code: 400, message: '无效的审核操作' });
      }
      const article = await queryOne('SELECT * FROM articles WHERE id = ? AND is_deleted = 0', [req.params.id]);
      if (!article) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      if (article.status !== 3) {
        return res.status(400).json({ code: 400, message: '该文章不在待审核状态' });
      }
      const newStatus = action === 'approve' ? 1 : 2;
      const publishedAt = action === 'approve' ? new Date() : null;
      await query('UPDATE articles SET status = ?, published_at = ? WHERE id = ?', [newStatus, publishedAt, req.params.id]);
      res.json({ code: 200, message: action === 'approve' ? '审核通过，文章已发布' : '已拒绝该文章' });
    } catch (err) {
      console.error('审核文章错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async getCommentList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const list = await query(
        `SELECT c.*, u.nickname AS user_name, a.title AS article_title
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN articles a ON c.article_id = a.id
         WHERE c.is_deleted = 0
         ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );
      const countResult = await queryOne('SELECT COUNT(*) as total FROM comments WHERE is_deleted = 0');
      res.json({
        code: 200,
        data: { list, pagination: { page, pageSize, total: countResult.total } }
      });
    } catch (err) {
      console.error('管理员获取评论列表错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async deleteComment(req, res) {
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

  async getUserList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const keyword = req.query.keyword;
      let whereSql = '';
      let params = [];
      if (keyword) {
        whereSql = 'WHERE username LIKE ? OR nickname LIKE ?';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      const list = await query(
        `SELECT id, username, nickname, email, role, status, created_at
         FROM users ${whereSql}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      const countResult = await queryOne(`SELECT COUNT(*) as total FROM users ${whereSql}`, params);
      res.json({
        code: 200,
        data: { list, pagination: { page, pageSize, total: countResult.total } }
      });
    } catch (err) {
      console.error('获取用户列表错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async toggleUserStatus(req, res) {
    try {
      const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
      if (!user) {
        return res.status(404).json({ code: 404, message: '用户不存在' });
      }
      if (user.role === 1) {
        return res.status(400).json({ code: 400, message: '不能操作管理员账号' });
      }
      const newStatus = user.status === 1 ? 0 : 1;
      await query('UPDATE users SET status = ? WHERE id = ?', [newStatus, req.params.id]);
      res.json({ code: 200, message: newStatus === 0 ? '已禁用该用户' : '已启用该用户' });
    } catch (err) {
      console.error('切换用户状态错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
}

module.exports = new AdminController();
