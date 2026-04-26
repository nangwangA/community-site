-- =====================================================
-- 轻量化图文社区网站 - MySQL 数据库建表脚本
-- 数据库字符集: utf8mb4 (支持emoji)
-- 排序规则: utf8mb4_general_ci
-- =====================================================

CREATE DATABASE IF NOT EXISTS `community_site`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE `community_site`;

-- =====================================================
-- 1. 用户表 (users)
-- 存储注册用户和管理员信息
-- =====================================================
DROP TABLE IF EXISTS `likes`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `articles`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` varchar(50) NOT NULL COMMENT '登录用户名',
  `password` varchar(255) NOT NULL COMMENT '密码(加密存储)',
  `nickname` varchar(50) DEFAULT '' COMMENT '显示昵称',
  `avatar` varchar(255) DEFAULT '' COMMENT '头像URL',
  `email` varchar(100) DEFAULT '' COMMENT '邮箱(选填)',
  `bio` varchar(500) DEFAULT '' COMMENT '个人简介',
  `role` tinyint unsigned DEFAULT 0 COMMENT '角色: 0普通用户, 1管理员',
  `status` tinyint unsigned DEFAULT 1 COMMENT '状态: 0禁用, 1正常',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='用户表';

-- =====================================================
-- 2. 分类表 (categories)
-- 文章分类枚举
-- =====================================================
CREATE TABLE `categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(30) NOT NULL COMMENT '分类名称',
  `sort_order` int unsigned DEFAULT 0 COMMENT '排序权重, 越小越靠前',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='文章分类表';

-- =====================================================
-- 3. 文章表 (articles)
-- 核心业务表, 存储所有文章内容
-- =====================================================
CREATE TABLE `articles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` int unsigned NOT NULL COMMENT '作者ID',
  `category_id` int unsigned NOT NULL COMMENT '分类ID',
  `title` varchar(200) NOT NULL COMMENT '文章标题',
  `content` longtext NOT NULL COMMENT '文章正文(支持富文本HTML)',
  `summary` varchar(500) DEFAULT '' COMMENT '文章摘要/简介',
  `cover_image` varchar(255) DEFAULT '' COMMENT '封面图URL',
  `status` tinyint unsigned DEFAULT 1 COMMENT '状态: 0草稿, 1已发布, 2已下架',
  `view_count` int unsigned DEFAULT 0 COMMENT '浏览量',
  `like_count` int unsigned DEFAULT 0 COMMENT '点赞数(冗余字段)',
  `comment_count` int unsigned DEFAULT 0 COMMENT '评论数(冗余字段)',
  `is_deleted` tinyint unsigned DEFAULT 0 COMMENT '软删除: 0正常, 1已删除',
  `published_at` datetime DEFAULT NULL COMMENT '首次发布时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_status` (`status`, `is_deleted`, `published_at`),
  KEY `idx_published` (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='文章表';

-- =====================================================
-- 4. 评论表 (comments)
-- 支持一级评论和二级回复(楼中楼)
-- =====================================================
CREATE TABLE `comments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `article_id` int unsigned NOT NULL COMMENT '所属文章ID',
  `user_id` int unsigned NOT NULL COMMENT '评论者ID',
  `parent_id` int unsigned DEFAULT 0 COMMENT '父评论ID, 0表示一级评论',
  `reply_to_user_id` int unsigned DEFAULT NULL COMMENT '被回复的用户ID',
  `content` text NOT NULL COMMENT '评论内容',
  `ip_address` varchar(45) DEFAULT '' COMMENT '评论IP地址(IPv4/IPv6)',
  `is_deleted` tinyint unsigned DEFAULT 0 COMMENT '软删除: 0正常, 1已删除',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间',
  PRIMARY KEY (`id`),
  KEY `idx_article_id` (`article_id`, `parent_id`, `created_at`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='评论表';

-- =====================================================
-- 5. 点赞表 (likes)
-- 记录用户对文章的点赞, 联合唯一防止重复
-- =====================================================
CREATE TABLE `likes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` int unsigned NOT NULL COMMENT '点赞用户ID',
  `article_id` int unsigned NOT NULL COMMENT '点赞文章ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_article` (`user_id`, `article_id`),
  KEY `idx_article_id` (`article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='文章点赞表';

-- =====================================================
-- 6. 收藏表 (favorites)
-- 记录用户对文章的收藏, 联合唯一防止重复
-- =====================================================
CREATE TABLE `favorites` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` int unsigned NOT NULL COMMENT '收藏用户ID',
  `article_id` int unsigned NOT NULL COMMENT '收藏文章ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_article` (`user_id`, `article_id`),
  KEY `idx_article_id` (`article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='文章收藏表';

-- =====================================================
-- 初始化数据
-- =====================================================

-- 插入默认分类
INSERT INTO `categories` (`name`, `sort_order`) VALUES
('杂谈', 1),
('生活', 2),
('技术', 3),
('随笔', 4);

-- 插入默认管理员账号 (用户名: admin, 密码: admin123 的bcrypt哈希值示例)
-- 注意: 生产环境请使用真正的密码哈希, 此处仅为占位
INSERT INTO `users` (`username`, `password`, `nickname`, `avatar`, `email`, `bio`, `role`, `status`) VALUES
('admin', '$2y$10$placeholder_hash_replace_me', '站长', '', 'admin@example.com', '网站管理员', 1, 1);
