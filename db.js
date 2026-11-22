const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '219929',
  database: process.env.DB_NAME || 'url_shortener',
});

// A database connection failure should be returned by the affected request,
// not raised as an unhandled EventEmitter error that stops the web server.
db.on('error', (error) => {
  console.error('MySQL connection error:', error.message);
});

module.exports=db;
