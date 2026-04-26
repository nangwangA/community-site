const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../config/db');
const config = require('../config/config');
const { filterSensitive, hasSensitiveWord } = require('../middleware/validate');

class UserController {
  async register(req, res) {
    try {
      const { username, password, email } = req.body;
      if (password.length < 6 || password.length > 20) {
        return res.status(400).json({ code: 400, message: '密码长度应在6-20个字符之间' });
      }
      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        return res.status(400).json({ code: 400, message: '用户名只能包含字母、数字、下划线和中文' });
      }
      const existing = await queryOne('SELECT id FROM users WHERE username = ?', [username]);
      if (existing) {
        return res.status(400).json({ code: 400, message: '该用户名已被注册' });
      }
      if (hasSensitiveWord(username)) {
        return res.status(400).json({ code: 400, message: '用户名包含非法字符' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(
        'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
        [username, hashedPassword, email || '']
      );
      res.json({ code: 200, message: '注册成功，请登录' });
    } catch (err) {
      console.error('注册错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async login(req, res) {
    try {
      const { username, password, remember } = req.body;
      const user = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
      if (!user) {
        return res.status(401).json({ code: 401, message: '用户名或密码错误' });
      }
      if (user.status === 0) {
        return res.status(403).json({ code: 403, message: '账号已被禁用，请联系管理员' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ code: 401, message: '用户名或密码错误' });
      }
      const expiresIn = remember ? '30d' : config.jwtExpiresIn;
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.jwtSecret,
        { expiresIn }
      );
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });
      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            nickname: user.nickname || user.username,
            avatar: user.avatar,
            role: user.role
          }
        }
      });
    } catch (err) {
      console.error('登录错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  logout(req, res) {
    res.clearCookie('token');
    res.json({ code: 200, message: '已退出登录' });
  }

  async getProfile(req, res) {
    try {
      const user = await queryOne(
        'SELECT id, username, nickname, avatar, email, bio, role, created_at FROM users WHERE id = ?',
        [req.user.id]
      );
      if (!user) {
        return res.status(404).json({ code: 404, message: '用户不存在' });
      }
      res.json({ code: 200, data: user });
    } catch (err) {
      console.error('获取个人信息错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async updateProfile(req, res) {
    try {
      const { nickname, avatar, bio } = req.body;
      if (nickname && hasSensitiveWord(nickname)) {
        return res.status(400).json({ code: 400, message: '昵称包含非法内容' });
      }
      if (bio && hasSensitiveWord(bio)) {
        return res.status(400).json({ code: 400, message: '简介包含非法内容' });
      }
      await query(
        'UPDATE users SET nickname = ?, avatar = ?, bio = ? WHERE id = ?',
        [nickname || '', avatar || '', bio || '', req.user.id]
      );
      res.json({ code: 200, message: '个人资料更新成功' });
    } catch (err) {
      console.error('更新个人资料错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await queryOne('SELECT password FROM users WHERE id = ?', [req.user.id]);
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ code: 400, message: '原密码不正确' });
      }
      if (newPassword.length < 6 || newPassword.length > 20) {
        return res.status(400).json({ code: 400, message: '新密码长度应在6-20个字符之间' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
      res.clearCookie('token');
      res.json({ code: 200, message: '密码修改成功，请重新登录' });
    } catch (err) {
      console.error('修改密码错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async getMyArticles(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const status = req.query.status !== undefined ? req.query.status : [0, 1, 2];
      let sql, params;
      if (Array.isArray(status)) {
        sql = `SELECT a.*, c.name AS category_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.user_id = ? AND a.is_deleted = 0 ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
        params = [req.user.id, pageSize, offset];
      } else {
        sql = `SELECT a.*, c.name AS category_name FROM articles a LEFT JOIN categories c ON a.category_id = c.id WHERE a.user_id = ? AND a.status = ? AND a.is_deleted = 0 ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
        params = [req.user.id, status, pageSize, offset];
      }
      const list = await query(sql, params);
      const countResult = await queryOne(
        Array.isArray(status)
          ? 'SELECT COUNT(*) as total FROM articles WHERE user_id = ? AND is_deleted = 0'
          : 'SELECT COUNT(*) as total FROM articles WHERE user_id = ? AND status = ? AND is_deleted = 0',
        Array.isArray(status) ? [req.user.id] : [req.user.id, status]
      );
      res.json({
        code: 200,
        data: {
          list,
          pagination: { page, pageSize, total: countResult.total }
        }
      });
    } catch (err) {
      console.error('获取我的文章错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async getMyComments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const list = await query(
        `SELECT c.*, a.title AS article_title FROM comments c
         LEFT JOIN articles a ON c.article_id = a.id
         WHERE c.user_id = ? AND c.is_deleted = 0
         ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
        [req.user.id, pageSize, offset]
      );
      const countResult = await queryOne(
        'SELECT COUNT(*) as total FROM comments WHERE user_id = ? AND is_deleted = 0',
        [req.user.id]
      );
      res.json({
        code: 200,
        data: {
          list,
          pagination: { page, pageSize, total: countResult.total }
        }
      });
    } catch (err) {
      console.error('获取我的评论错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async deleteMyComment(req, res) {
    try {
      const comment = await queryOne('SELECT * FROM comments WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (!comment) {
        return res.status(404).json({ code: 404, message: '评论不存在或无权删除' });
      }
      await query('UPDATE comments SET is_deleted = 1 WHERE id = ?', [req.params.id]);
      await query('UPDATE articles SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?', [comment.article_id]);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      console.error('删除评论错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async getMyFavorites(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const list = await query(
        `SELECT f.*, a.title, a.summary, u.nickname AS author_name, c.name AS category_name, a.created_at
         FROM favorites f
         JOIN articles a ON f.article_id = a.id
         JOIN users u ON a.user_id = u.id
         LEFT JOIN categories c ON a.category_id = c.id
         WHERE f.user_id = ? AND a.is_deleted = 0
         ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
        [req.user.id, pageSize, offset]
      );
      const countResult = await queryOne(
        'SELECT COUNT(*) as total FROM favorites f JOIN articles a ON f.article_id = a.id WHERE f.user_id = ? AND a.is_deleted = 0',
        [req.user.id]
      );
      res.json({
        code: 200,
        data: { list, pagination: { page, pageSize, total: countResult.total } }
      });
    } catch (err) {
      console.error('获取收藏列表错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
}

module.exports = new UserController();
