// Simple Group by Arrival Time (GAT) scheduler.
// This GAT acts as a simple fifo queue with matching 
// a min amount of users. 
class GatScheduler {
  /*
    *
    * @type params { min: int, max: int }
    * @type queue 
    */
  constructor(experimentName, Queue, params) {
    this.experimentName = experimentName
    this.min = parseInt(params.min)
    // Max not used
    this.max = parseInt(params.max)
    this.queue = new Queue(this.experimentName)
    //console.log(`Loaded scheduler params: min ${this.min} max ${this.max}`)
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

  checkConditionAndReturnUsers() {
    const queueSize = this.queue.size()
    if (queueSize >= this.min) {
      // How many to pop? min or max?
      // const noToPop = Math.min(queueSize, this.max) 
      return {
        condition: true,
        users: this.queue.pop(this.min),
        waitForCount: 0
      }
    }
    return {
      condition: false,
      users: this.queue.getQueue().slice(0, this.min),
      waitForCount: this.min - queueSize
    }
  }
}

module.exports = function() {
  return {
    name: 'GatScheduler',
    class: GatScheduler
  }
}
