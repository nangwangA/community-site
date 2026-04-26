USE `community_site`;

INSERT IGNORE INTO categories (`name`, `sort_order`) VALUES
('杂谈', 1),
('生活', 2),
('技术', 3),
('随笔', 4);

INSERT IGNORE INTO users (`username`, `password`, `nickname`, `avatar`, `email`, `bio`, `role`, `status`) VALUES
('admin', '$2y$10$placeholder_hash_replace_me', '站长', '', 'admin@example.com', '网站管理员', 1, 1);
