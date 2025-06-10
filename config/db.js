const mysql = require('mysql2');

// Создаем пул соединений
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: "09122005ABc",
  database: 'transpcalc',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Экспортируем промис-версию пула
module.exports = pool.promise();