const xss = require('xss');

const SENSITIVE_WORDS = ['敏感词1', '敏感词2', '违禁词', '广告', '赌博', '色情', '暴力', '政治'];

function filterSensitive(text) {
  if (!text) return text;
  let result = text;
  for (const word of SENSITIVE_WORDS) {
    result = result.replace(new RegExp(word, 'gi'), '**');
  }
  return result;
}

function hasSensitiveWord(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  for (const word of SENSITIVE_WORDS) {
    if (lowerText.includes(word.toLowerCase())) return true;
  }
  return false;
}

function sanitizeHtml(html) {
  return xss(html, {
    whiteList: {
      p: [], br: [], b: [], strong: [],
      i: [], em: [], u: [], s: [],
      h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
      blockquote: [], pre: [], code: [],
      ul: [], ol: [], li: [],
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      hr: [], div: [], span: []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
}

function validateBody(fields) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(fields)) {
      const value = req.body[field];
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rules.label || field}不能为空`);
        continue;
      }
      if (value !== undefined && value !== null && value !== '') {
        if (rules.min && value.length < rules.min) {
          errors.push(`${rules.label || field}长度不能少于${rules.min}个字符`);
        }
        if (rules.max && value.length > rules.max) {
          errors.push(`${rules.label || field}长度不能超过${rules.max}个字符`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${rules.label || field}格式不正确`);
        }
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ code: 400, message: errors[0], errors });
    }
    next();
  };
}

module.exports = { filterSensitive, hasSensitiveWord, sanitizeHtml, validateBody };
