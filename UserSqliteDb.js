// db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY,
      jsonObj TEXT
    )
  `);
});

db.saveUser = function(user) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO users (userId, jsonObj) VALUES (?, ?)`;
      db.run(query, [user.userId, JSON.stringify(user.serialize())], function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
}

db.findAll = function() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users`;
      db.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

module.exports = db;

