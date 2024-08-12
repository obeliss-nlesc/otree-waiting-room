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
    this.currentIndex = -1
    this.useRoundRobin = true
    // console.log(`Loaded GAT scheduler params: min ${this.min}`)
  }

  /*
   * @type user {User}
   */
  async queueUser(user) {
    // Queue user object which allows schedulers to decide on additional parameters
    // passed on in token like age and gender.
    // await this.queue.wait()
    this.queue.push(user)
    // this.queue.unlock()
  }

  resetQueue() {
    // Empties the Queue
    this.queue.reset()
  }

  getQueuedUserIds() {
    return this.queue.getQueue().map((u) => {
      return u.userId
    })
  }

  playersToWaitFor() {
    return Math.max(0, this.min - this.queue.size())
  }

  minPlayersNeeded() {
    return this.min
  }

  signalUsers() {
    const playersToWaitFor = this.playersToWaitFor()
    this.queue.getQueue().forEach((user) => {
      if (!user) {
        console.error(`User ${user.userId} not found!`)
        return
      }
      const sock = user.webSocket
      if (!sock) {
        console.error(`Socket for ${user.userId} not found!`)
        return
      }
      sock.emit("queueUpdate", {
        playersToWaitFor: playersToWaitFor,
        maxPlayers: this.min,
      })
    })
  }

  hasAvailableSlot(experiments) {
    const experiment = experiments[this.experimentName]
    if (!experiment) {
      return false
    }
    return Object.values(experiment.servers).some((s) => s.length >= this.min)
  }

  #getNextServer(experiments, usedUrls) {
    const keys = Object.keys(experiments)
    const values = Object.values(experiments)
    // console.log(keys)
    if (this.useRoundRobin) {
      // Use Round Robin load balancing. This is done over sessions not server ips
      for (let i = 0; i < keys.length; i++) {
        this.currentIndex = (this.currentIndex + 1) % keys.length
        const serverIp = keys[this.currentIndex]
        const serverUrls = values[this.currentIndex]
        if (serverUrls.length < this.min) {
          continue
        }

        let unusedUrlsCount = 0
        for (let serverUrl of serverUrls) {
          if (!usedUrls.has(serverUrl)) {
            unusedUrlsCount += 1
          }
        }
        if (unusedUrlsCount < this.min) {
          continue
        }
        // console.log(`index ${this.currentIndex} server ${serverIp}`)
        return [serverIp, serverUrls]
      }
      return [null, null]
    } else {
      // Fill up first server first (Spillover) load balancer
      for (const [serverIp, serverUrls] of Object.entries(
        experiments[this.experimentName].servers,
      )) {
        if (serverUrls.length < this.min) {
          continue
        }

        let unusedUrlsCount = 0
        for (let serverUrl of serverUrls) {
          if (!usedUrls.has(serverUrl)) {
            unusedUrlsCount += 1
          }
        }
        if (unusedUrlsCount < this.min) {
          continue
        }
        return [serverIp, serverUrls]
      } // For
      return [null, null]
    } // Else
  }

  checkConditionAndReturnUsers(experiments, usedUrls) {
    // await this.queue.wait()
    const queueSize = this.queue.size()
    const falseCondition = {
      condition: false,
      users: this.queue.getQueue().slice(0, this.min),
      waitForCount: Math.max(0, this.min - queueSize),
      server: null,
    }
    if (
      queueSize < this.min ||
      !(
        experiments &&
        experiments[this.experimentName] &&
        experiments[this.experimentName].servers
      )
    ) {
      // this.queue.unlock()
      return falseCondition
    }

    const [serverIp, serverUrls] = this.#getNextServer(
      experiments[this.experimentName].servers,
      usedUrls,
    )
    if (!serverIp) {
      return falseCondition
    }

    const users = this.queue.pop(this.min)
    for (const user of users) {
      while (true) {
        const url = serverUrls.pop()
        if (!usedUrls.has(url)) {
          user.redirectedUrl = url
          user.changeState("waitAgreement")
          usedUrls.add(url)
          break
        }
        serverUrls.unshift(url)
      }
    }
    // this.queue.unlock()
    return {
      condition: true,
      users: users,
      waitForCount: 0,
      server: serverIp,
    }
  }
} // Class

module.exports = function () {
  return {
    name: "GatScheduler",
    class: GatScheduler,
  }
}
