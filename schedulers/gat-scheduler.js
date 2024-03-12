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
    if (this.queue.size(this.experimentName) >= this.min) {
      return this.queue.pop(this.experimentName, this.min)
    }
    return false
  }
  waitCount() {
    return this.min - this.queue.size(this.experimentName)
  }
  getWaitingUsers() {
    q = this.queue.getQueue(this.experimentName)
    return q.slice(0, this.min)
  }

}

module.exports = function() {
  return {
    name: 'GatScheduler',
    class: GatScheduler
  }
}
