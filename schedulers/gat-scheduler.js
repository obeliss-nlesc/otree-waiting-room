// Simple Group by Arrivial Time (GAT) scheduler.
// This GAT acts as a simple fifo queue with matching 
// a min ammount of users. 
class GatScheduler {
  /*
    *
    * @type params { min: int, max: int }
    * @type queue 
    */
  constructor(experimentName, queue, params) {
    this.experimentName = experimentName
    this.min = parseInt(params.min)

    this.max = parseInt(params.max)
    this.queue = queue
    console.log(`Loaded scheduler params: min ${this.min} max ${this.max}`)
  }

  queueUser(userId) {
    this.queue.push(this.experimentName, userId)
  }

  checkConditionAndReturnUsers() {
    const queueSize = this.queue.size(this.experimentName)
    if (queueSize >= this.min) {
      const noToPop = Math.min(queueSize, this.max) 
      return this.queue.pop(this.experimentName, noToPop)
    }
    return false
  }

  waitCount() {
    return this.min - this.queue.size(this.experimentName)
  }

  getWaitingUsers() {
    const q = this.queue.getQueue(this.experimentName)
    return q.slice(0, this.min)
  }

}

module.exports = function() {
  return {
    name: 'GatScheduler',
    class: GatScheduler
  }
}
