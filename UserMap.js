const User = require("./user.js")

class UserMap extends Map {
  constructor(file) {
    super()
  }

  load() {
    throw new Error("Method not implemented.")
  }

  find(userId) {
    return Array.from(this.values()).filter((u) => {
      return u.userId == userId
    })
  }

  getUsersInSession(session) {
    return Array.from(this.values()).filter((u) => {
      if (!u.server) {
        return false
      }
      const userSession = u.server.split("#")[1]
      return userSession == session
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

  upsert(user) {
    throw new Error("Method not implemented.")
  }

  save(user) {
    throw new Error("Method not implemented.")
  }

  saveAll() {
    throw new Error("Method not implemented.")
  }

  forceSave() {
    throw new Error("Method not implemented.")
  }
}

module.exports = UserMap
