const { weightSrvRecords } = require("ioredis/built/cluster/util")
const io = require("socket.io-client")

class VirtualUser {
  constructor(userId, experimentId, serverUrl) {
    this.userId = userId
    this.experimentId = experimentId
    this.serverUrl = serverUrl
    this.redirectUrl = null
    this.state = "new"
    this.flag = 0
  }
  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      this.serverUrl = this.serverUrl || serverUrl
      this.socket = io(this.serverUrl)
      this.socket.on("connect", () => {
        this.flag = 0
        console.log(`[${this.userId}] connected.`)
        this.state = "connected"
        resolve()
      })
      this.socket.on("connect_error", (err) => {
        console.log(`[${this.userId}] error connection.`)
        this.sate = "error"
        // reject(err)
      })
    })
  }
  #setupSocketEvents() {
    if (this.state == "redirected") {
      return
    }
    if (!this.socket) {
      console.error(`[${this.userId}] socket null!!`)
      return
    }
    this.socket.on("wait", (data) => {
      console.log(`[${this.userId}] received wait.`)
      this.flag = 0
      this.state = "queued"
    })
    this.socket.on("queueUpdate", (data) => {
      console.log(`[${this.userId}] received queueUpdate.`)
      this.flag = 0
      // Nothing to do
    })
    this.socket.on("gameStart", (data) => {
      this.flag = 0
      console.log(`[${this.userId}] redirected to ${data.room}.`)
      this.state = "redirected"
      this.redirectUrl = data.room
      this.socket.close()
    })
    this.socket.on("disconnect", () => {
      this.flag = 0
      // console.log(`[${this.userId}] disconnected from ${this.serverUrl}`)
      this.socket = null
      this.state = "disconnected"
    })
  }
  #goToLandingPage() {
    if (this.state == "redirected") {
      return
    }
    this.socket.emit("landingPage", {
      experimentId: this.experimentId,
      userId: this.userId,
    })
    this.socket.emit("newUser", {
      experimentId: this.experimentId,
      userId: this.userId,
    })
    const that = this
    const intervatl = setInterval(() => {
      if ((this.state == "connected") || (this.state == "error")) {
        this.socket.close()
        clearInterval(intervatl)
        console.log(`[${this.userId}] reconnecting.`)
        this.socket = io(this.serverUrl)
        this.attemptQueueFlow(true)
        return
      }
      if (that.state == "redirected" || !that.socket) {
        clearInterval(intervatl)
        return
      }
      if (that.flag > 0) {
        that.socket.emit("newUser", {
          experimentId: that.experimentId,
          userId: that.userId,
        })
      } else {
        // console.log(`[${that.userId}] in stuck interval.`)
        that.flag += 1
      }
    }, 5000)
  }

  #flipCoin() {
    // Generate a random number between 0 and 1
    const randomNumber = Math.random()
    return randomNumber < 0.5
  }

  attemptQueueFlow(random) {
    this.#setupSocketEvents()

    this.socket.on("agree", (data) => {
      console.log(`[${this.userId}] received agree.`)
      this.flag = 0
      // Choose to agree or not
      if (random && this.#flipCoin()) {
        // do not agree and wait for timeout
        return
      }
      const uuid = data.uuid
      this.socket.emit("userAgreed", {
        experimentId: this.experimentId,
        userId: this.userId,
        uuid: uuid,
      })
      this.state = "agreed"
    })

    this.socket.on("reset", (data) => {
      console.log(`[${this.userId}] received reset.`)
      this.flag = 0
      this.state = "startedPage"
      this.socket.emit("newUser", {
        experimentId: this.experimentId,
        userId: this.userId,
      })
    })
    this.#goToLandingPage()
  } //attemptQueueFlow
}

module.exports = VirtualUser
