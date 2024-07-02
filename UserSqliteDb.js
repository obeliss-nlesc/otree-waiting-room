const sqlite3 = require("sqlite3").verbose()
const User = require("./user.js")
const UserMap = require("./UserMap.js")

class UserSqliteDb extends UserMap {
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

  _getTableNames() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT name FROM sqlite_master WHERE type='table'",
        [],
        (err, rows) => {
          if (err) {
            reject(err)
          } else {
            const tableNames = rows.map((row) => row.name)
            resolve(tableNames)
          }
        },
      )
    }) // Promise
  }

  load() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users`
      this.db.all(query, (err, rows) => {
        if (err) {
          console.error(err)
          reject(err)
        } else {
          rows
            .map((r) => {
              return JSON.parse(r.jsonObj)
            })
            .forEach((u) => {
              const user = new User(u.userId, u.experimentId)
              user.redirectedUrl = u.redirectedUrl
              user.experimentUrl = u.experimentUrl
              user.groupId = u.groupId
              user.server = u.server
              user.oTreeId = u.oTreeId
              user.tokenParams = u.tokenParams
              user.state = u.redirectedUrl ? u.state : user.state
              const compoundKey = `${user.userId}:${user.experimentId}`
              this.set(compoundKey, user)
            })
          resolve(this)
        }
      })
    }) //Promise
  }

  findAll() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM users`
      this.db.all(query, (err, rows) => {
        if (err) {
          reject(err)
        } else {
          resolve(rows)
        }
      })
    }) // Promise
  }

  upsert(user) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (userId, jsonObj) 
        VALUES (?, ?)
        ON CONFLICT(userId) DO UPDATE SET 
          jsonObj = excluded.jsonObj
      `
      const compoundKey = `${user.userId}:${user.experimentId}`
      this.db.run(
        query,
        [compoundKey, JSON.stringify(user.serialize())],
        function (err) {
          if (err) {
            reject(err)
          } else {
            // console.log(`${compoundKey} upsert`)
            resolve(compoundKey)
          }
        },
      )
    })
  }

  save(user) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO users (userId, jsonObj) VALUES (?, ?)`
      const compoundKey = `${user.userId}:${user.experimentId}`
      this.db.run(
        query,
        [compoundKey, JSON.stringify(user.serialize())],
        function (err) {
          if (err) {
            reject(err)
          } else {
            resolve(compoundKey)
          }
        },
      )
    }) // Promise
  }

  saveAll() {
    this.writeCounter += 1
    const currentCounter = this.writeCounter
    setTimeout(() => {
      if (currentCounter != this.writeCounter || this.writeCounter === 0) {
        return
      }
      this.forEach((u, k) => {
        this.upsert(u)
      })
    }, 500)
  }

  forceSave() {
    const allUpserts = [...this.values()].map((u) => {
      return this.upsert(u)
    })
    return Promise.all(allUpserts)
  }
}

module.exports = UserSqliteDb
