const test = require("node:test")
const assert = require("node:assert")
const UserDb = require("../UserSqliteDb.js")
const User = require("../user.js")

test("test initialize sqlite db", async () => {
  const usersDb = new UserDb(":memory:")
  const tables = await usersDb._getTableNames()
  assert.deepStrictEqual(tables, ["users"])
})

test("test insert user", async () => {
  const usersDb = new UserDb(":memory:")
  const user = new User("u001", "TestExperiment")
  await usersDb.save(user)
  const rows = await usersDb.findAll()
  const firstUser = rows[0]
  const u = JSON.parse(firstUser.jsonObj)
  assert.strictEqual("TestExperiment", u.experimentId)
})

test("test upsert user", async () => {
  const usersDb = new UserDb(":memory:")
  const user = new User("u001", "TestExperiment")
  await usersDb.save(user)
  let rows = await usersDb.findAll()
  let firstUser = rows[0]
  let u = JSON.parse(firstUser.jsonObj)
  assert.strictEqual("TestExperiment", u.experimentId)

  user.redirectedUrl = "http://127.0.0.1/etgohome"
  await usersDb.upsert(user)
  rows = await usersDb.findAll()
  firstUser = rows[0]
  u = JSON.parse(firstUser.jsonObj)
  assert.strictEqual("u001", u.userId)
  assert.strictEqual("http://127.0.0.1/etgohome", u.redirectedUrl)

  user.experimentId = "AnotherExperiment"
  await usersDb.upsert(user)
  rows = await usersDb.findAll()
  firstUser = rows[0]
  u = JSON.parse(firstUser.jsonObj)
  assert.strictEqual("u001", u.userId)
  assert.notEqual("AnotherExperiment", u.experimentId)

  assert.strictEqual(2, rows.length)

  let secondUser = rows[1]
  let u2 = JSON.parse(secondUser.jsonObj)
  assert.strictEqual("u001", u2.userId)
  assert.strictEqual("AnotherExperiment", u2.experimentId)
})
