const test = require("node:test")
const assert = require("node:assert")
const db = require("../UserSqliteDb")
const User = require("../user.js")

test("test initialize sqlite db", () => {
  db.serialize()
  // const queueName = "name1"
  // const localQueue = new LocalQueue(queueName)
  // localQueue.push(123)
  // localQueue.push(456)
  // localQueue.push(789)
  // assert.deepStrictEqual(localQueue.getQueue(), [123, 456, 789])
  //
  // assert.deepStrictEqual(localQueue.pop(2), [123, 456])
  // assert.deepStrictEqual(localQueue.getQueue(), [789])
  //
  // assert.strictEqual(localQueue.isEmpty(), false)
})

test("test insert user", async () => {

  const user = new User("u001", "TestExperiment")
  await db.saveUser(user)
  const rows = await db.findAll()
  console.log(rows)

})
