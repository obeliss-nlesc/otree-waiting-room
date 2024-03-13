const test = require("node:test");
const assert = require("node:assert");
const ClassLoader = require("../class_loader.js")

test("test private constructor ClassLoader", async () => {
  assert.throws(() => {
    new ClassLoader('./') 
  }, TypeError)
});

test("test initialize() constructor", async () => {
  const classLoader = await ClassLoader.initialize('./schedulers')
  assert(classLoader instanceof ClassLoader)
});
