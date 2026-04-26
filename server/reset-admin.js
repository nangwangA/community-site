const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  console.log('生成的bcrypt哈希:', hashedPassword);

  const pool = await mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'community_site',
    charset: 'utf8mb4'
  });

  await pool.execute(
    "UPDATE users SET password = ?, nickname = 0xE7AB99E995BF, bio = 0xE7BD91E7AB99E7AEA1E79086E59198 WHERE username = 'admin'",
    [hashedPassword]
  );

  console.log('✅ 管理员密码已更新');
  const [rows] = await pool.execute("SELECT id, username, role, status FROM users WHERE username = 'admin'");
  console.log('当前管理员信息:', rows[0]);
  await pool.end();
}

main().catch(console.error);
