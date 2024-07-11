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

test("test GAT scheduler round robin balance over different servers/sessions", () => {
  const experimentName = "exp001"
  const experiments = {
    exp001: {
      name: experimentName,
      servers: {
        "127.0.0.1#qwerty": [
          "http://127.0.0.1/1",
          "http://127.0.0.1/2",
          "http://127.0.0.1/3",
          "http://127.0.0.1/4",
          "http://127.0.0.1/5",
          "http://127.0.0.1/6",
          "http://127.0.0.1/7",
          "http://127.0.0.1/8",
          "http://127.0.0.1/9",
        ],
        "127.0.0.1#plmokn": [
          "http://127.0.0.1/11",
          "http://127.0.0.1/22",
          "http://127.0.0.1/33",
        ],
        "127.0.0.2#qazwsx": [
          "http://127.0.0.2/21",
          "http://127.0.0.2/22",
          "http://127.0.0.2/23",
        ],
        "127.0.0.2#wsxedc": [
          "http://127.0.0.2/31",
          "http://127.0.0.2/32",
          "http://127.0.0.2/33",
          "http://127.0.0.2/34",
          "http://127.0.0.2/35",
          "http://127.0.0.2/36",
        ],
      },
    },
  }
  // const usedUrls = new Set(["http://127.0.0.1/1"])
  const usedUrls = new Set()
  const scheduler = new Scheduler(experimentName, LocalQueue, { min: 3 })
  const users = [
    "u01",
    "u02",
    "u03",
    "u04",
    "u05",
    "u06",
    "u07",
    "u08",
    "u09",
  ].map((userId) => {
    return new User(userId, experimentName)
  })
  users.forEach((user) => {
    user.changeState("startedPage")
  })
  users.forEach((user) => {
    user.changeState("queued")
    scheduler.queueUser(user)
  })
  assert.strictEqual(scheduler.queue.size(), 9)

  let lastServer = null

  for (let i = 0; i < 3; i++) {
    // Schedule 3 times, each time the next server#session should be chosen
    let conditionObject = scheduler.checkConditionAndReturnUsers(
      experiments,
      usedUrls,
    )
    const server = conditionObject.server
    assert.notStrictEqual(server, null)
    assert.notStrictEqual(server, lastServer)
    lastServer = server
    assert.strictEqual(server, lastServer)
  }
})

test("test GAT scheduler round robin balance over different servers/sessions with no available slots on other servers", () => {
  const experimentName = "exp001"
  const experiments = {
    exp001: {
      name: experimentName,
      servers: {
        "127.0.0.1#qwerty": [
          "http://127.0.0.1/1",
          "http://127.0.0.1/2",
          "http://127.0.0.1/3",
          "http://127.0.0.1/4",
          "http://127.0.0.1/5",
          "http://127.0.0.1/6",
          "http://127.0.0.1/7",
          "http://127.0.0.1/8",
          "http://127.0.0.1/9",
        ],
        "127.0.0.1#plmokn": ["http://127.0.0.1/11"],
        "127.0.0.2#qazwsx": ["http://127.0.0.2/21"],
        "127.0.0.2#wsxedc": ["http://127.0.0.2/31"],
      },
    },
  }
  // const usedUrls = new Set(["http://127.0.0.1/1"])
  const usedUrls = new Set()
  const scheduler = new Scheduler(experimentName, LocalQueue, { min: 3 })
  const users = [
    "u01",
    "u02",
    "u03",
    "u04",
    "u05",
    "u06",
    "u07",
    "u08",
    "u09",
  ].map((userId) => {
    return new User(userId, experimentName)
  })
  users.forEach((user) => {
    user.changeState("startedPage")
  })
  users.forEach((user) => {
    user.changeState("queued")
    scheduler.queueUser(user)
  })
  assert.strictEqual(scheduler.queue.size(), 9)

  let lastServer = "127.0.0.1#qwerty"

  for (let i = 0; i < 3; i++) {
    // Schedule 3 times, each time the next server#session should be chosen
    let conditionObject = scheduler.checkConditionAndReturnUsers(
      experiments,
      usedUrls,
    )
    const server = conditionObject.server
    assert.notStrictEqual(server, null)
    assert.strictEqual(server, lastServer)
  }
})
