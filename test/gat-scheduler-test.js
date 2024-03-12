const test = require("node:test");
const assert = require("node:assert");
const LocalQueue = require("../local-queue")
const Scheduler = require("../schedulers/gat-scheduler.js")().class
const User = require("../user.js");

test("test GAT scheduler", () => {
  const experimentName = "exp001"
  const scheduler = new Scheduler(experimentName, LocalQueue, {min:3, max:7})
  const users = ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07'].map(userId => {
    return new User(userId, experimentName)
  })
  users.forEach(user => {
    scheduler.queueUser(user)
  })
  assert.strictEqual(scheduler.queue.size(), 7)

  conditionObject = scheduler.checkConditionAndReturnUsers()
  assert.strictEqual(conditionObject.condition, true)
  assert.strictEqual(conditionObject.users.length, 3)
  assert.strictEqual(conditionObject.waitForCount, 0)
  
  assert.strictEqual(scheduler.queue.size(), 4)

  conditionObject = scheduler.checkConditionAndReturnUsers()
  assert.strictEqual(conditionObject.condition, true)
  assert.strictEqual(conditionObject.users.length, 3)
  assert.strictEqual(conditionObject.waitForCount, 0)
 
  assert.strictEqual(scheduler.queue.size(), 1)

  const userIds = scheduler.queue.getQueue().map(u => u.userId)

  assert.deepStrictEqual(userIds, ['u07'])
  
  conditionObject = scheduler.checkConditionAndReturnUsers()
  assert.strictEqual(conditionObject.condition, false)
  assert.strictEqual(conditionObject.users.length, 1)
  assert.strictEqual(conditionObject.waitForCount, 2)

});
