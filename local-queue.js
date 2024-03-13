// A LocalQueue implementation
class LocalQueue {
  constructor(queueName) {
    this.name = queueName
    this.queue = new Array()
  }

  push(item) {
    const q = this.queue
    if (!q.includes(item)) {
      q.push(item)
    }
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
    return (this.queue.length == 0)
  }

  size() {
    return this.queue.length
  }
}

module.exports = LocalQueue

