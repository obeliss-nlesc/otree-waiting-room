const io = require('socket.io-client')
// let socket = null
//
// module.exports = {
//   init: async (serverUrl, userId) => {
//     socket = io('http://localhost:8060')
//     socket.on('connect', () => {
//       console.log(`User ${userId} connected to ${serverUrl}`)
//     })
//   },
//   queue: async (experimentId) => {
//     socket.on('wait', (data) => {
//       console.log(`User ${userId} in wait state.`)
//     })
//     socket.on("reset", (data) => {
//       console.log(`User ${userId} in reset.`)
//     })
//     socket.emit("landingPage", {
//       experimentId: experimentId,
//       userId: userId,
//     })
//   }
// }
//

class VirtualUser {
  constructor(userId, experimentId, serverUrl){
    this.userId = userId
    this.experimentId = experimentId
    this.serverUrl = serverUrl
    this.state = "new"
  }
  connect(serverUrl) {
    return new Promise((resolve,reject) => {
      this.serverUrl = this.serverUrl || serverUrl
      this.socket = io(this.serverUrl)
      this.socket.on('connect', () => {
        console.log(`[${this.userId}] connected to ${this.serverUrl}`)
        resolve()
      })
    })
  }
  attemptNormalQueueFlow(){
    if (!this.socket) {
      console.error(`[${this.userId}] socket null!!`)
      return
    }
    this.socket.on("wait", (data) => {
      this.state = "queued"
    })
    this.socket.on("reset", (data) => {
      this.state = "startedPage"
    })
    this.socket.on("queueUpdate" ,(data) => {
      // Nothing to do
    })
    this.socket.on("agree", (data) => {
      const uuid = data.uuid
      // Choose to agree or not
      this.socket.emit("userAgreed", {
        experimentId: this.experimentId,
        userId: this.userId,
        uuid: uuid,
      })
      this.state = "agreed"
    })
    this.socket.on("gameStart", (data) => {
      console.log(`[${this.userId}] redirected to ${data.room}.`)
      this.state = "redirected"
    })
    this.socket.on("disconnect", () => {
      console.log(`[${this.userId}] disconnected from ${this.serverUrl}`)
      this.socket = null
      this.state = "disconnected"
    })
    this.socket.emit("landingPage", {
      experimentId: this.experimentId,
      userId: this.userId
    })
    this.state = "startedPage"
    this.socket.emit("newUser", {
      experimentId: this.experimentId,
      userId: this.userId
    })
  }
}

module.exports = VirtualUser
