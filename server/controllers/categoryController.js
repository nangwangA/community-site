const { query, queryOne } = require('../config/db');

class CategoryController {
  async getList(req, res) {
    try {
      const list = await query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
      const countResult = await query('SELECT c.id, c.name, COUNT(a.id) AS article_count FROM categories c LEFT JOIN articles a ON a.category_id = c.id AND a.is_deleted = 0 AND a.status = 1 GROUP BY c.id ORDER BY c.sort_order ASC');
      const result = list.map(cat => ({
        ...cat,
        article_count: (countResult.find(c => c.id === cat.id)?.article_count) || 0
      }));
      res.json({ code: 200, data: result });
    } catch (err) {
      console.error('获取分类列表错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async create(req, res) {
    try {
      const { name, sort_order } = req.body;
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ code: 400, message: '分类名称不能为空' });
      }
      if (name.length > 30) {
        return res.status(400).json({ code: 400, message: '分类名称不能超过30个字符' });
      }
      const existing = await queryOne('SELECT id FROM categories WHERE name = ?', [name.trim()]);
      if (existing) {
        return res.status(400).json({ code: 400, message: '该分类已存在' });
      }
      await query('INSERT INTO categories (name, sort_order) VALUES (?, ?)', [name.trim(), sort_order || 0]);
      res.json({ code: 200, message: '创建成功' });
    } catch (err) {
      console.error('创建分类错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async update(req, res) {
    try {
      const { name, sort_order } = req.body;
      const category = await queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
      if (!category) {
        return res.status(404).json({ code: 404, message: '分类不存在' });
      }
      if (name && name !== category.name) {
        const existing = await queryOne('SELECT id FROM categories WHERE name = ? AND id != ?', [name.trim(), req.params.id]);
        if (existing) {
          return res.status(400).json({ code: 400, message: '该分类名已被使用' });
        }
      }
      await query(
        'UPDATE categories SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order) WHERE id = ?',
        [name ? name.trim() : null, sort_order, req.params.id]
      );
      res.json({ code: 200, message: '更新成功' });
    } catch (err) {
      console.error('更新分类错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }

  async delete(req, res) {
    try {
      const category = await queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
      if (!category) {
        return res.status(404).json({ code: 404, message: '分类不存在' });
      }
      const articleCount = await queryOne('SELECT COUNT(*) as cnt FROM articles WHERE category_id = ? AND is_deleted = 0', [req.params.id]);
      if (articleCount.cnt > 0) {
        return res.status(400).json({ code: 400, message: `该分类下还有 ${articleCount.cnt} 篇文章，无法删除` });
      }
      await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      console.error('删除分类错误:', err);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
}

module.exports = new CategoryController();
