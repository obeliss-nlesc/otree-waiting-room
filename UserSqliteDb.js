const sqlite3 = require("sqlite3").verbose()
// const db = new sqlite3.Database(':memory:');
const User = require("./user.js")

class UserDb extends Map {
  constructor(file) {
    super()
    this.writeCounter = 0
    this.db = new sqlite3.Database(file)
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          userId TEXT PRIMARY KEY,
          jsonObj TEXT
        )
      `)
    })
  }
  load() {
    const query = `SELECT * FROM users`
    this.db.all(query, (err, rows) => {
      if (err) {
        console.error(err)
      } else {
        rows
          .map((r) => {
            return JSON.parse(r.jsonObj)
          })
          .forEach((u) => {
            console.log(u)
            const user = new User(u.userId, u.experimentId)
            user.redirectedUrl = u.redirectedUrl
            user.experimentUrl = u.experimentUrl
            user.groupId = u.groupId
            user.oTreeId = u.oTreeId
            user.tokenParams = u.tokenParams
            user.state = u.redirectedUrl ? u.state : user.state
            const compoundKey = `${user.userId}:${user.experimentId}`
            this.set(compoundKey, user)
          })
      }
    })
  }
  find(userId) {
    return Array.from(this.values()).filter((u) => {
      return u.userId == userId
    })
  }
  getUsedUrls() {
    return Array.from(this.values())
      .filter((u) => {
        return u.experimentUrl
      })
      .map((u) => {
        return u.experimentUrl
      })
  }
  dump() {
    const data = []
    this.forEach((v, k) => {
      data.push(v.serialize())
    })

    return JSON.stringify(data)
  }
  saveUser(user) {
    const query = `INSERT INTO users (userId, jsonObj) VALUES (?, ?)`
    const compoundKey = `${user.userId}:${user.experimentId}`
    this.db.run(
      query,
      [compoundKey, JSON.stringify(user.serialize())],
      function (err) {
        if (err) {
          console.error(err)
        } else {
          console.log(`${compoundKey} written`)
        }
      },
    )
  }
  save() {
    this.writeCounter += 1
    const currentCounter = this.writeCounter
    setTimeout(() => {
      if (currentCounter != this.writeCounter || this.writeCounter === 0) {
        return
      }
      this.#save()
    }, 500)
  }
  forceSave() {
    this.#save()
  }
  #save() {
    const data = []
    this.forEach((u, k) => {
      this.saveUser(u)
    })
  }
}

module.exports = UserDb

// db.serialize(() => {
//   db.run(`
//     CREATE TABLE IF NOT EXISTS users (
//       userId TEXT PRIMARY KEY,
//       jsonObj TEXT
//     )
//   `);
// });
//
// db.saveUser = function(user) {
//     return new Promise((resolve, reject) => {
//       const query = `INSERT INTO users (userId, jsonObj) VALUES (?, ?)`;
//       db.run(query, [user.userId, JSON.stringify(user.serialize())], function (err) {
//         if (err) {
//           reject(err);
//         } else {
//           resolve();
//         }
//       });
//     });
// }
//
// db.getTables = function() {
//   return new Promise((resolve, reject) => {
//     const query = `SELECT name FROM sqlite_master WHERE type='table'`;
//     db.all(query, (err, rows) => {
//       if (err) {
//         reject(err);
//       } else {
//         resolve(rows.map(row => row.name));
//       }
//     });
//   });
// };
//
//
// module.exports = db;
//
