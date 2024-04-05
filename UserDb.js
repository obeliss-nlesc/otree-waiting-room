// Persisting the User Map to disk

const murmurhash = require('murmurhash')
const fs = require('fs').promises
const User = require("./user.js")

class UserDb extends Map {
  constructor(file) {
    super()
    this.seed = 42
    this.file = file
    this.lastHash = 0
  }
  load() {
    let data = []
    return fs.readFile(this.file).then((d) => {
      data = JSON.parse(d)
      data.forEach(u => {
        const user = new User(u.userId, u.experimentId)
        user.redirectedUrl = u.redirectedUrl
        user.oTreeId = u.oTreeId
        user.tokenParams = u.tokenParams
        user.state = (u.redirectedUrl) ? u.state : user.state
        this.set(user.userId, user)
      })
    }).catch((err) => {
      console.error(`[WARNING] UserDb file ${this.file} file not found will be recreated!`)
    })
  }
  save() {
    const data = []
    this.forEach((v, k) => {
      data.push(v.serialize())
    })

    const dump = JSON.stringify(data)
    const h = murmurhash(dump, this.seed)
    if (this.lastHash !== h) {
      fs.writeFile(this.file, dump).then(() => {
        this.lastHash = h
      }).catch((err) => {
        console.error("[ERROR] Writing UserDb to file.")
      })
    }
  }
}

module.exports = UserDb
