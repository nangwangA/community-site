const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');

const userRoutes = require('./routes/user');
const articleRoutes = require('./routes/article');
const commentRoutes = require('./routes/comment');
const categoryRoutes = require('./routes/category');
const adminRoutes = require('./routes/admin');

const app = express();

const isProd = config.nodeEnv === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

app.use(cors({
  origin: isProd ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '..', 'public')));

if (isProd) {
  app.set('trust proxy', 1);
}

app.use((req, res, next) => {
  console.log(`${new Date().toLocaleString()} ${req.method} ${req.url}`);
  next();
});

app.use('/api/user', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'ok', time: new Date().toISOString() });
});

app.use((req, res) => {
  if (!req.url.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
  res.status(404).json({ code: 404, message: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  if (isProd) {
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  } else {
    res.status(500).json({ code: 500, message: err.message || '服务器内部错误' });
  }
});

app.listen(config.port, config.host, () => {
  console.log('====================================');
  console.log(`  环境: ${config.nodeEnv}`);
  console.log(`  服务启动成功`);
  console.log(`  地址: http://localhost:${config.port}`);
  console.log(`  API文档: http://localhost:${config.port}/api/health`);
  console.log('====================================');
});
