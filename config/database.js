const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Shivam##123',
  database: 'bloodbank_db',
  port: 3306,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create promise wrapper
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
  try {
    const [rows] = await promisePool.execute('SELECT 1 as test');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  pool: promisePool,
  testConnection
};
