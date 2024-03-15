// Simple Group by Arrival Time (GAT) scheduler.
// This GAT acts as a simple fifo queue with matching 
// a min amount of users. 
class GatScheduler {
  /*
    *
    * @type params { min: int }
    * @type queue 
    */
  constructor(experimentName, Queue, params) {
    this.experimentName = experimentName
    this.min = parseInt(params.min)
    this.queue = new Queue(this.experimentName)
    console.log(`Loaded GAT scheduler params: min ${this.min}`)
  }

  /*
    * @type user {User}
    */
  queueUser(user) {
    // Queue user object which allows schedulers to decide on additional parameters
    // passed on in token like age and gender.
    //console.log(`GAT queued user: ${user.userId} params ${JSON.stringify(user.tokenParams)}`)
    this.queue.push(user)
  }

  playersToWaitFor() {
    return Math.max(0, this.min - this.queue.size())
  }

  minPlayersNeeded() {
    return this.min
  }

  signalUsers() {
    const playersToWaitFor = this.playersToWaitFor()
    this.queue.getQueue().forEach(user => {
      if (!user) {
        console.error(`User ${userId} not found!`)
        return
      }
      const sock = user.webSocket
      if (!sock) {
        console.error(`Socket for ${userId} not found!`)
        return
      }
      sock.emit('queueUpdate',{
        playersToWaitFor: playersToWaitFor,
        maxPlayers: this.min
      })
    })
  }

  checkConditionAndReturnUsers(experiments, usedUrls) {
    const queueSize = this.queue.size()
    const falseCondition = {
      condition: false,
      users: this.queue.getQueue().slice(0, this.min),
      waitForCount: Math.max(0, this.min - queueSize),
      server: null
    }
    if (queueSize < this.min || !(experiments && experiments[this.experimentName] && experiments[this.experimentName].servers)) {
      return falseCondition
    }

    for (const [serverIp, serverUrls] of Object.entries(experiments[this.experimentName].servers)) {
      if (serverUrls.length < this.min) {
        continue
      }

      let unusedUrlsCount = 0;
      for (let serverUrl of serverUrls) {
        if (!usedUrls.has(serverUrl)) {
          unusedUrlsCount += 1
        }
      }
      if (unusedUrlsCount < this.min) {
        continue
      }

      const users = this.queue.pop(this.min)
      for (const user of users) {
        while (true) {
          const url = serverUrls.pop()
          if (!usedUrls.has(url)) {
            user.redirectedUrl = url
            usedUrls.add(url)
            break
          }
          serverUrls.unshift(url)
        }
      }
      return {
        condition: true,
        users: users,
        waitForCount: 0,
        server: serverIp
      }
    }

    return falseCondition
  }
}

module.exports = function() {
  return {
    name: 'GatScheduler',
    class: GatScheduler
  }
}
