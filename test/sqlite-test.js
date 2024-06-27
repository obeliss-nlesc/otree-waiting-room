const test = require("node:test")
const assert = require("node:assert")
const db = require("../UserSqliteDb")
const User = require("../user.js")

test("test initialize sqlite db", async () => {
  db.serialize()
  const tables = await db.getTables()
  assert.deepStrictEqual(tables, ["users"])
})

test("test insert user", async () => {
  const user = new User("u001", "TestExperiment")
  await db.saveUser(user)
  const rows = await db.findAll()
  const firstUser = rows[0]
  const u = JSON.parse(firstUser.jsonObj)
  assert.strictEqual("TestExperiment", u.experimentId)
})
