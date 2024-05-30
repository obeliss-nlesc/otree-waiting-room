const { weightSrvRecords } = require('ioredis/built/cluster/util')
const io = require('socket.io-client')

class VirtualUser {
  constructor(userId, experimentId, serverUrl){
    this.userId = userId
    this.experimentId = experimentId
    this.serverUrl = serverUrl
    this.redirectUrl = null
    this.state = "new"
    this.flag = 0
  }
  connect(serverUrl) {
    return new Promise((resolve,reject) => {
      this.serverUrl = this.serverUrl || serverUrl
      this.socket = io(this.serverUrl)
      this.socket.on('connect', () => {
        this.flag = 0
        // console.log(`[${this.userId}] connected to ${this.serverUrl}`)
        resolve()
      })
    })
  }
  #setupSocketEvents(){
    if (this.state == "redirected") {
      return
    }
    if (!this.socket) {
      console.error(`[${this.userId}] socket null!!`)
      return
    }
    this.socket.on("wait", (data) => {
      this.flag = 0
      this.state = "queued"
    })
    this.socket.on("queueUpdate" ,(data) => {
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
  #goToLandingPage(){
      if (this.state == "redirected") {
        return
      }
      // console.log(`${this.userId} emmiting landingPage`)
      this.socket.emit("landingPage", {
        experimentId: this.experimentId,
        userId: this.userId
      })
      // console.log(`${this.userId} emmiting newUser`)
      this.socket.emit("newUser", {
        experimentId: this.experimentId,
        userId: this.userId
      })
      const that = this
      const intervatl = setInterval(() => {
        if ((that.state == "redirected") || (!that.socket)) {
          clearInterval(intervatl)
          return
        }
        if (that.flag > 0) {
          that.socket.emit("newUser", {
            experimentId: that.experimentId,
            userId: that.userId
          })
        } else {
          that.flag += 1
        }
      }, 5000)

  }

  #flipCoin() {
      // Generate a random number between 0 and 1
      const randomNumber = Math.random();
      // Return "Heads" if the number is less than 0.5, otherwise return "Tails"
      return (randomNumber < 0.5)
  }

  attemptQueueFlow(random){
    this.#setupSocketEvents()

    this.socket.on("agree", (data) => {
      this.flag = 0
      if (random && this.#flipCoin()) {
        // console.log(`${this.userId} ignoring agreement`)
        return
      }
      // console.log(`${this.userId} accepting agreement`)
      const uuid = data.uuid
      // Choose to agree or not
      this.socket.emit("userAgreed", {
        experimentId: this.experimentId,
        userId: this.userId,
        uuid: uuid,
      })
      this.state = "agreed"
    })

    this.socket.on("reset", (data) => {
      this.flag = 0
      this.state = "startedPage"
      // console.log(`${this.userId} emmiting newUser`)
      this.socket.emit("newUser", {
        experimentId: this.experimentId,
        userId: this.userId
      })
    })
    this.#goToLandingPage()
  }//attemptQueueFlow
}

module.exports = VirtualUser
