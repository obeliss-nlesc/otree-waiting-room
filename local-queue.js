// A LocalQueue implementation
class LocalQueue {
  constructor(queueName) {
    this.name = queueName
    this.queue = []
    this.simpleLock = 0
  }

  push(item) {
    const q = this.queue
    if (!q.includes(item)) {
      q.push(item)
    }
  }

  reset() {
    this.queue.length = 0
  }

  lock() {
    this.simpleLock = 1
  }

  unlock() {
    this.simpleLock = 0
  }

  wait() {
    return new Promise((resolve, reject) => {
      const testLockInterval = setInterval(() => {
        if (this.simpleLock > 0) {
          return
        }
        this.lock()
        clearInterval(testLockInterval)
        resolve()
      }, 200)
    })
  }

  pushAndGetQueue(item) {
    this.push(item)
    return this.queue
  }

  pop(count) {
    const q = this.queue
    if (q.length < count) {
      return []
    }
    return q.splice(0, count)
  }

  getQueue() {
    return this.queue
  }

  isEmpty() {
    return this.queue.length === 0
  }

  size() {
    return this.queue.length
  }
}

module.exports = LocalQueue
