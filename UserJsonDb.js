// Persisting the User Map to disk

const murmurhash = require("murmurhash")
const fs = require("fs").promises
const User = require("./user.js")
const UserMap = require("./UserMap.js")

class UserJsonDb extends UserMap {
  constructor(file) {
    super()
    this.seed = 42
    this.file = file
    this.lastHash = 0
    this.writeCounter = 0
  }

  load() {
    let data = []
    return fs
      .readFile(this.file)
      .then((d) => {
        data = JSON.parse(d)
        data
          .filter((u) => {
            return u.state === "inoTreePages"
          })
          .forEach((u) => {
            const user = new User(u.userId, u.experimentId)
            user.redirectedUrl = u.redirectedUrl
            user.experimentUrl = u.experimentUrl
            user.groupId = u.groupId
            user.oTreeId = u.oTreeId
            user.server = u.server
            user.tokenParams = u.tokenParams
            user.state = u.redirectedUrl ? u.state : user.state
            const compoundKey = `${user.userId}:${user.experimentId}`
            this.set(compoundKey, user)
          })
      })
      .catch((err) => {
        console.error(
          `[WARNING] UserDb file ${this.file} file not found will be recreated!`,
        )
      })
  }

  upsert() {
    // Implement interface method
    return this.save()
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

  saveAll() {
    return this.save()
  }

  forceSave() {
    const data = []
    this.forEach((v, k) => {
      data.push(v.serialize())
    })
    const dump = JSON.stringify(data, null, 2)
    return fs.writeFile(this.file, dump)
  }

  #save() {
    const data = []
    this.forEach((v, k) => {
      data.push(v.serialize())
    })

    const dump = JSON.stringify(data, null, 2)
    const h = murmurhash(dump, this.seed)
    //console.log(`${h}:${this.lastHash}:${dump}`)
    if (this.lastHash !== h) {
      fs.writeFile(this.file, dump)
        .then(() => {
          this.lastHash = h
          this.writeCounter = 0
        })
        .catch((err) => {
          console.error("[ERROR] Writing UserDb to file.")
        })
    }
  }
}

module.exports = UserJsonDb
