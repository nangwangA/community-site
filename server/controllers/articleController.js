const { query, queryOne, beginTransaction } = require('../config/db');
const { filterSensitive, hasSensitiveWord, sanitizeHtml } = require('../middleware/validate');

class ArticleController {
  async getList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const category_id = req.query.category_id;
      const keyword = req.query.keyword;
      let whereSql = 'WHERE a.is_deleted = 0 AND a.status = 1';
      let params = [];
      if (category_id) {
        whereSql += ' AND a.category_id = ?';
        params.push(category_id);
      }
      if (keyword) {
        whereSql += ' AND (a.title LIKE ? OR a.content LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      const list = await query(
        `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count, a.like_count,
                a.comment_count, a.published_at, a.created_at,
                u.id AS user_id, u.nickname AS author_name, u.avatar AS author_avatar,
                c.name AS category_name
         FROM articles a
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN categories c ON a.category_id = c.id
         ${whereSql}
         ORDER BY a.published_at DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      const countResult = await queryOne(
        `SELECT COUNT(*) as total FROM articles a ${whereSql}`,
        params
      );
      res.json({
        code: 200,
        data: { list, pagination: { page, pageSize, total: countResult.total } }
      });
    } catch (err) {
      console.error('获取文章列表错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async getDetail(req, res) {
    try {
      const article = await queryOne(
        `SELECT a.*, u.nickname AS author_name, u.avatar AS author_avatar, u.bio AS author_bio,
                c.name AS category_name
         FROM articles a
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE a.id = ? AND a.is_deleted = 0`,
        [req.params.id]
      );
      if (!article) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      if (req.user && article.status === 0 && article.user_id !== req.user.id && req.user.role !== 1) {
        return res.status(403).json({ code: 403, message: '无权查看此文章' });
      }
      if (article.status === 2 && article.user_id !== req.user?.id && req.user?.role !== 1) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      if (article.status === 3 && article.user_id !== req.user?.id && req.user?.role !== 1) {
        return res.status(404).json({ code: 404, message: '文章正在审核中' });
      }
      await query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);
      article.view_count += 1;
      let isLiked = false;
      let isFavorited = false;
      if (req.user) {
        isLiked = !!(await queryOne('SELECT id FROM likes WHERE user_id = ? AND article_id = ?', [req.user.id, req.params.id]));
        isFavorited = !!(await queryOne('SELECT id FROM favorites WHERE user_id = ? AND article_id = ?', [req.user.id, req.params.id]));
      }
      res.json({ code: 200, data: { ...article, isLiked, isFavorited } });
    } catch (err) {
      console.error('获取文章详情错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async create(req, res) {
    try {
      const { title, content, category_id, summary, cover_image, status } = req.body;
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ code: 400, message: '文章标题不能为空' });
      }
      if (title.length > 200) {
        return res.status(400).json({ code: 400, message: '标题不能超过200个字符' });
      }
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ code: 400, message: '文章内容不能为空' });
      }
      if (hasSensitiveWord(title)) {
        return res.status(400).json({ code: 400, message: '标题包含敏感词' });
      }
      if (hasSensitiveWord(content)) {
        return res.status(400).json({ code: 400, message: '内容包含敏感词' });
      }
      const cleanContent = sanitizeHtml(content);
      const cleanSummary = sanitizeHtml(summary || '');
      let finalStatus = status || 0;
      if (finalStatus === 1 && req.user.role !== 1) {
        finalStatus = 3;
      }
      const publishedAt = finalStatus === 1 ? new Date() : null;
      const result = await query(
        `INSERT INTO articles (user_id, category_id, title, content, summary, cover_image, status, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, category_id || 1, title.trim(), cleanContent, cleanSummary, cover_image || '', finalStatus, publishedAt]
      );
      const msgMap = { 0: '草稿保存成功', 1: '发布成功', 3: '提交审核成功，请等待站长审核' };
      res.json({ code: 200, message: msgMap[finalStatus] || '操作成功', data: { id: result.insertId, status: finalStatus } });
    } catch (err) {
      console.error('创建文章错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async update(req, res) {
    try {
      const { title, content, category_id, summary, cover_image, status } = req.body;
      const article = await queryOne('SELECT * FROM articles WHERE id = ? AND is_deleted = 0', [req.params.id]);
      if (!article) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      if (article.user_id !== req.user.id && req.user.role !== 1) {
        return res.status(403).json({ code: 403, message: '无权编辑此文章' });
      }
      if (title && hasSensitiveWord(title)) {
        return res.status(400).json({ code: 400, message: '标题包含敏感词' });
      }
      if (content && hasSensitiveWord(content)) {
        return res.status(400).json({ code: 400, message: '内容包含敏感词' });
      }
      const cleanContent = content ? sanitizeHtml(content) : undefined;
      const cleanSummary = summary !== undefined ? sanitizeHtml(summary) : undefined;
      const newStatus = status !== undefined ? status : article.status;
      const publishedAt = newStatus === 1 && !article.published_at ? new Date() : article.published_at;
      await query(
        `UPDATE articles SET title = COALESCE(?, title), content = COALESCE(?, content),
         category_id = COALESCE(?, category_id), summary = COALESCE(?, summary),
         cover_image = COALESCE(?, cover_image), status = ?,
         published_at = COALESCE(?, published_at)
         WHERE id = ?`,
        [title || null, cleanContent, category_id || null, cleanSummary, cover_image || null, newStatus, publishedAt, req.params.id]
      );
      res.json({ code: 200, message: '更新成功' });
    } catch (err) {
      console.error('更新文章错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async delete(req, res) {
    try {
      const article = await queryOne('SELECT * FROM articles WHERE id = ? AND is_deleted = 0', [req.params.id]);
      if (!article) {
        return res.status(404).json({ code: 404, message: '文章不存在' });
      }
      if (article.user_id !== req.user.id && req.user.role !== 1) {
        return res.status(403).json({ code: 403, message: '无权删除此文章' });
      }
      await query('UPDATE articles SET is_deleted = 1 WHERE id = ?', [req.params.id]);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      console.error('删除文章错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async getMyList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const keyword = req.query.keyword;
      let whereSql = 'WHERE a.is_deleted = 0 AND a.user_id = ?';
      let params = [req.user.id];
      if (keyword) {
        whereSql += ' AND (a.title LIKE ? OR a.content LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
      }
      const list = await query(
        `SELECT a.id, a.title, a.summary, a.cover_image, a.status, a.view_count, a.like_count,
                a.comment_count, a.published_at, a.created_at,
                c.name AS category_name
         FROM articles a
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
      console.error('获取我的文章错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async toggleLike(req, res) {
    try {
      const existing = await queryOne(
        'SELECT id FROM likes WHERE user_id = ? AND article_id = ?',
        [req.user.id, req.params.id]
      );
      if (existing) {
        await query('DELETE FROM likes WHERE id = ?', [existing.id]);
        await query('UPDATE articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [req.params.id]);
        res.json({ code: 200, message: '已取消点赞', data: { liked: false } });
      } else {
        await query('INSERT INTO likes (user_id, article_id) VALUES (?, ?)', [req.user.id, req.params.id]);
        await query('UPDATE articles SET like_count = like_count + 1 WHERE id = ?', [req.params.id]);
        res.json({ code: 200, message: '点赞成功', data: { liked: true } });
      }
    } catch (err) {
      console.error('点赞操作错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async toggleFavorite(req, res) {
    try {
      const existing = await queryOne(
        'SELECT id FROM favorites WHERE user_id = ? AND article_id = ?',
        [req.user.id, req.params.id]
      );
      if (existing) {
        await query('DELETE FROM favorites WHERE id = ?', [existing.id]);
        res.json({ code: 200, message: '已取消收藏', data: { favorited: false } });
      } else {
        await query('INSERT INTO favorites (user_id, article_id) VALUES (?, ?)', [req.user.id, req.params.id]);
        res.json({ code: 200, message: '收藏成功', data: { favorited: true } });
      }
    } catch (err) {
      console.error('收藏操作错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
}

module.exports = new ArticleController();
