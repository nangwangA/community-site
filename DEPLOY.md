# 轻社区网站 - 部署指南

本文提供两种部署方式，任选其一即可。

---

## 方式一：Railway 部署（推荐新手，免费额度，5分钟上线）

### 前置准备
1. 注册 [GitHub](https://github.com) 账号（如果还没有）
2. 注册 [Railway](https://railway.app) 账号（用 GitHub 登录即可）

### 第1步：推送代码到 GitHub

```bash
# 1. 在 GitHub 上创建一个新仓库（比如叫 community-site）
# 2. 在本地项目根目录执行：

cd c:\Users\jsl\Desktop\动态网站

# 初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "init: 轻社区网站项目"

# 关联远程仓库（替换为你的GitHub用户名和仓库名）
git remote add origin https://github.com/你的用户名/community-site.git

# 推送代码
git push -u origin main
```

> ⚠️ 如果提示 `main` 分支不存在，用 `git branch -M main` 先重命名分支。

### 第2步：在 Railway 上部署后端 + 数据库

1. 打开 https://railway.app ，点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"** → 授权你的 GitHub → 选择 `community-site` 仓库
3. Railway 会自动检测到 Node.js 项目，进入部署设置：

#### 设置环境变量（关键！）

在 Railway 项目中：
- 点击左侧 **"Variables"** 标签
- 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | `3000` | 服务端口 |
| `NODE_ENV` | `production` | 生产模式 |
| `JWT_SECRET` | 随机生成一串复杂字符 | 用这个命令生成：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_HOST` | （稍后填）MySQL 的 Host |
| `DB_PORT` | `3306` |
| `DB_USER` | （稍后填）MySQL 用户名 |
| `DB_PASSWORD` | （稍后填）MySQL 密码 |
| `DB_NAME` | `community_site` |

### 第3步：添加 MySQL 数据库服务

1. 在同一个 Railway 项目中，点击 **"+ New"** → **"Database"** → 选择 **"MySQL Add-on"**
2. 创建完成后，点击进入该数据库服务
3. 找到 **Connection URL** 或 **Variables**，复制以下信息：
   - MySQL Host（类似 `xxx.up.railway.app`）
   - 用户名、密码、数据库名
4. 回到第2步的环境变量，把 DB_HOST / DB_USER / DB_PASSWORD 填上

### 第4步：初始化数据库表结构

Railway 的数据库创建好后需要建表。有两种方式：

**方式 A：通过 Railway Console 执行 SQL**
1. 在 Railway 中点击你的 MySQL 服务
2. 选择 **"Query"** 标签
3. 把 `server/database.sql` 的内容粘贴进去执行

**方式 B：本地连接远程数据库执行**
```bash
mysql -h 你的railway主机地址 -u 用户名 -p密码 < server/database.sql --default-character-set=utf8mb4
```

### 第5步：部署前端静态文件

Railway 部署后，API 和前端都在同一个域名下运行。
由于我们的 app.js 已经配置了静态文件服务（`express.static`），所以**不需要额外操作**——访问 Railway 给的域名就能看到完整网站。

### 第6步：获取公网地址

部署成功后，Railway 会给你一个类似 `https://xxx.up.railway.app` 的地址，直接访问即可！

---

## 方式二：云服务器部署（阿里云/腾讯云，完全自主控制）

### 第0步：购买服务器

推荐配置（入门够用）：
- **CPU**: 2核
- **内存**: 2GB ~ 4GB
- **硬盘**: 40GB SSD
- **带宽**: 1Mbps ~ 3Mbps
- **系统**: Ubuntu 22.04 LTS（推荐）或 CentOS 7
- **费用**: 约 ¥50~100/月（新用户有优惠）

> 📌 购买时选择**按量付费**或**包年包月**均可

### 第1步：服务器基础环境安装

用 SSH 连接服务器后，依次执行：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 确认安装成功
node -v    # 应显示 v20.x.x
npm -v     # 应显示 10.x.x

# 安装 MySQL 8.0
sudo apt install -y mysql-server

# 启动 MySQL 并设置开机自启
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置（设置root密码等）
sudo mysql_secure_installation
```

执行 `mysql_secure_installation` 时的建议回答：
- `Validate Password Component`: 选 `No`（简单点）
- `Set root password?`: **Yes** → 设置一个强密码（记下来！）
- 其余全部选 `Yes`

### 第2步：安装 Nginx 和 PM2

```bash
# 安装 Nginx（反向代理）
sudo apt install -y nginx

# 安装 PM2（Node.js 进程管理器，自动重启崩溃的服务）
sudo npm install -g pm2

# 设置 PM2 开机自启
pm2 startup
# 它会输出一条命令，复制执行它（类似: sudo env PATH=... pm2 startup ...）
pm2 save
```

### 第3步：上传项目代码到服务器

**方式 A：使用 Git（推荐）**

```bash
# 在服务器上
cd /var/www
sudo mkdir community-site
sudo chown $USER:$USER community-site
cd community-site

# 克隆你的代码（先推送到 GitHub）
git clone https://github.com/你的用户名/community-site.git .
```

**方式 B：使用 SCP/SFTP 直接上传**

在本地电脑 PowerShell 中执行：
```powershell
# 把整个项目上传到服务器（替换为你的服务器IP和用户名）
scp -r c:\Users\jsl\Desktop\动态网站\* root@你的服务器IP:/var/www/community-site/
```

### 第4步：配置环境变量

```bash
cd /var/www/community-site/server

# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

`.env` 文件内容改为：
```
PORT=3000
JWT_SECRET=这里填一个随机的长字符串
JWT_EXPIRES_IN=7d
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你刚才设置的MySQL密码
DB_NAME=community_site

ALLOWED_ORIGINS=https://你的域名.com,http://你的域名.com
```

保存退出（Ctrl+O → Enter → Ctrl+X）

### 第5步：初始化数据库并导入数据

```bash
# 连接 MySQL
mysql -u root -p

# 在 MySQL 中执行：
CREATE DATABASE community_site CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 导入表结构和初始数据
mysql -u root -p community_site < database.sql --default-character-set=utf8mb4
mysql -u root -p community_site < init_data.sql --default-character-set=utf8mb4
mysql -u root -p community_site < init_admin.sql --default-character-set=utf8mb4
```

### 第6步：安装依赖并启动服务

```bash
cd /var/www/community-site/server

# 安装依赖
npm install --production

# 用 PM2 启动（进程守护，崩溃自动重启）
pm2 start app.js --name "community-site"

# 保存 PM2 进程列表
pm2 save

# 查看 PM2 状态
pm2 status
pm2 logs community-site   # 查看日志
```

### 第7步：配置 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/community-site
```

写入以下内容（把 `your-domain.com` 替换为你的实际域名或 IP）：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 这里填你的域名或服务器IP

    # 前端静态文件
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API 接口
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 头像上传文件
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }

    client_max_body_size 10m;
}
```

启用站点并测试：
```bash
# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/community-site /etc/nginx/sites-enabled/

# 删除默认站点（避免冲突）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置是否正确
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 第8步：（可选）配置 HTTPS 免费证书

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 自动申请证书并配置 Nginx
sudo certbot --nginx -d your-domain.com

# 按提示输入邮箱，选择是否重定向 HTTP→HTTPS（选 2: Redirect）
```

### 第9步：开放防火墙端口

```bash
# UFW 防火墙放行必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 如果用的是阿里云/腾讯云，还需要在云控制台的「安全组」中放行 80 和 443 端口
```

### 第10步：域名解析（如果你有域名）

在你的域名服务商（如阿里云域名控制台）添加解析记录：

| 记录类型 | 主机记录 | 记录值 |
|---------|---------|--------|
| A | @ | 你的服务器 IP |
| A | www | 你的服务器 IP |

等待 DNS 生效（通常几分钟到几小时），然后就可以通过域名访问了！

---

## 常用运维命令速查

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs community-site
pm2 logs community-site --lines 100  # 最近100行

# 重启服务
pm2 restart community-site

# 停止服务
pm2 stop community-site

# 更新代码后重新部署
cd /var/www/community-site
git pull
cd server && npm install --production
pm2 restart community-site

# 重载 Nginx
sudo systemctl reload nginx

# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/access.log
```

---

## 部署检查清单

- [ ] 环境变量已正确配置（.env 文件）
- [ ] 数据库已建表并导入初始数据
- [ ] npm install 已完成（无报错）
- [ ] pm2 启动服务正常（pm2 status 显示 online）
- [ ] Nginx 配置正确且已 reload
- [ ] 防火墙/安全组已开放 80、443 端口
- [ ] 能通过浏览器访问首页
- [ ] 能正常注册/登录账号
- [ ] 能发布文章并通过审核
