var Mutex = require('async-mutex').Mutex
// A LocalQueue implementation
class LocalQueue {
  constructor(queueName) {
    this.name = queueName
    this.queue = []
    this.mutex = new Mutex()
    this.simple_lock = 0
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
    this.simple_lock = 1
    // return this.mutex.acquire()
  }

  unlock() {
    this.simple_lock = 0
    // this.mutex.release()
  }

  wait() {
    return new Promise((resolve, reject) => {
      // this.mutex.waitForUnlock().then(() => {
      //   this.lock().then(() => {
      //     resolve()
      //   })
      // })
      const testLockInterval = setInterval(() => {
        if (this.simple_lock > 0) {
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
