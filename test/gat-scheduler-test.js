const test = require("node:test")
const assert = require("node:assert")
const LocalQueue = require("../local-queue")
const Scheduler = require("../schedulers/gat-scheduler.js")().class
const User = require("../user.js")

test("test GAT scheduler with enough rooms", () => {
  const experimentName = "exp001"
  const experiments = {
    exp001: {
      name: experimentName,
      servers: {
        "127.0.0.1": [
          "http://127.0.0.1/1",
          "http://127.0.0.1/2",
          "http://127.0.0.1/3",
          "http://127.0.0.1/4",
          "http://127.0.0.1/5",
          "http://127.0.0.1/6",
        ],
      },
    },
  }
  const usedUrls = new Set()
  const scheduler = new Scheduler(experimentName, LocalQueue, { min: 3 })
  const users = ["u01", "u02", "u03", "u04", "u05", "u06", "u07"].map(
    (userId) => {
      return new User(userId, experimentName)
    },
  )
  users.forEach((user) => {
    user.changeState("startedPage")
  })

  users.forEach((user) => {
    user.changeState("queued")
    scheduler.queueUser(user)
  })
  assert.strictEqual(scheduler.queue.size(), 7)

  let conditionObject = scheduler.checkConditionAndReturnUsers(
    experiments,
    usedUrls,
  )
  assert.strictEqual(conditionObject.condition, true)
  assert.strictEqual(conditionObject.users.length, 3)
  assert.strictEqual(conditionObject.waitForCount, 0)

  assert.strictEqual(scheduler.queue.size(), 4)

  assert.strictEqual(usedUrls.size, 3)

  conditionObject = scheduler.checkConditionAndReturnUsers(
    experiments,
    usedUrls,
  )
  assert.strictEqual(conditionObject.condition, true)
  assert.strictEqual(conditionObject.users.length, 3)
  assert.strictEqual(conditionObject.waitForCount, 0)

  assert.strictEqual(scheduler.queue.size(), 1)

  assert.strictEqual(usedUrls.size, 6)

  const userIds = scheduler.queue.getQueue().map((u) => u.userId)

  assert.deepStrictEqual(userIds, ["u07"])

  conditionObject = scheduler.checkConditionAndReturnUsers(experiments)
  assert.strictEqual(conditionObject.condition, false)
  assert.strictEqual(conditionObject.users.length, 1)
  assert.strictEqual(conditionObject.waitForCount, 2)

  assert.strictEqual(usedUrls.size, 6)
})

test("test GAT scheduler without enough rooms", () => {
  const experimentName = "exp001"
  const experiments = {
    exp001: {
      name: experimentName,
      servers: {
        "127.0.0.1": [
          "http://127.0.0.1/1",
          "http://127.0.0.1/2",
          "http://127.0.0.1/3",
          "http://127.0.0.1/4",
        ],
      },
    },
  }
  const usedUrls = new Set()
  const scheduler = new Scheduler(experimentName, LocalQueue, { min: 3 })
  const users = ["u01", "u02", "u03", "u04", "u05", "u06", "u07"].map(
    (userId) => {
      return new User(userId, experimentName)
    },
  )
  users.forEach((user) => {
    user.changeState("startedPage")
  })
  users.forEach((user) => {
    user.changeState("queued")
    scheduler.queueUser(user)
  })
  assert.strictEqual(scheduler.queue.size(), 7)

  let conditionObject = scheduler.checkConditionAndReturnUsers(
    experiments,
    usedUrls,
  )
  assert.strictEqual(conditionObject.condition, true)
  assert.strictEqual(conditionObject.users.length, 3)
  assert.strictEqual(conditionObject.waitForCount, 0)

  assert.strictEqual(scheduler.queue.size(), 4)

  assert.strictEqual(usedUrls.size, 3)

  conditionObject = scheduler.checkConditionAndReturnUsers(
    experiments,
    usedUrls,
  )
  assert.strictEqual(conditionObject.condition, false)
  assert.strictEqual(conditionObject.users.length, 3)
  assert.strictEqual(conditionObject.waitForCount, 0)

  assert.strictEqual(scheduler.queue.size(), 4)

  assert.strictEqual(usedUrls.size, 3)

  const userIds = scheduler.queue.getQueue().map((u) => u.userId)

  assert.deepStrictEqual(userIds, ["u04", "u05", "u06", "u07"])
})

test("test GAT scheduler with used URLs", () => {
  const experimentName = "exp001"
  const experiments = {
    exp001: {
      name: experimentName,
      servers: {
        "127.0.0.1": [
          "http://127.0.0.1/1",
          "http://127.0.0.1/2",
          "http://127.0.0.1/3",
        ],
      },
    },
  }
  const usedUrls = new Set(["http://127.0.0.1/1"])
  const scheduler = new Scheduler(experimentName, LocalQueue, { min: 3 })
  const users = ["u01", "u02", "u03"].map((userId) => {
    return new User(userId, experimentName)
  })
  users.forEach((user) => {
    user.changeState("startedPage")
  })
  users.forEach((user) => {
    user.changeState("queued")
    scheduler.queueUser(user)
  })
  assert.strictEqual(scheduler.queue.size(), 3)

  let conditionObject = scheduler.checkConditionAndReturnUsers(
    experiments,
    usedUrls,
  )
  assert.strictEqual(conditionObject.condition, false)
  assert.strictEqual(conditionObject.users.length, 3)
  assert.strictEqual(conditionObject.waitForCount, 0)

  assert.strictEqual(usedUrls.size, 1)
})
