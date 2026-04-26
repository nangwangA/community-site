const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool(config.db);

async function query(sql, params) {
  try {
    if (params && params.length) {
      sql = mysql.format(sql, params);
    }
    const [rows] = await pool.query(sql);
    return rows;
  } catch (error) {
    console.error('SQL Error:', error.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function beginTransaction() {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  return conn;
}

module.exports = { pool, query, queryOne, beginTransaction };
