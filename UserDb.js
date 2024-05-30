// Persisting the User Map to disk

const murmurhash = require("murmurhash")
const fs = require("fs").promises
const User = require("./user.js")
const { SHA1 } = require("crypto-js")

class UserDb extends Map {
  constructor(file) {
    super()
    this.seed = 42
    this.file = file
    this.lastHash = 0
    this.writeCounter = 0
    this.forcedSave = 0
  }
  load() {
    let data = []
    return fs
      .readFile(this.file)
      .then((d) => {
        data = JSON.parse(d)
        data.forEach((u) => {
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
      })
      .catch((err) => {
        console.error(
          `[WARNING] UserDb file ${this.file} file not found will be recreated!`,
        )
      })
  }
  find(userId) {
    return Array.from(this.values()).filter((u) => {
      return u.userId == userId
    })
  }
  getUsedUrls(){
    return Array.from(this.values()).filter((u) => {
      return (u.experimentUrl)
    }).map((u) => {
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
  save(){
    this.writeCounter += 1
    const currentCounter = this.writeCounter
    setTimeout(() => {
      if ( (currentCounter != this.writeCounter) || (this.writeCounter === 0) ){
        return
      }
      this.#save()
    }, 500)
  }
  forceSave(){
    if (this.forcedSave > 0) {
      return
    }
    this.forcedSave = 1 
    const data = []
    this.forEach((v, k) => {
      data.push(v.serialize())
    })
    const dump = JSON.stringify(data, null, 2)

    console.log("Saving DB: ", dump)
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

module.exports = UserDb
