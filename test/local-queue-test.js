const test = require("node:test");
const assert = require("node:assert");
const LocalQueue = require("../local-queue")

test("test local queue", () => {
	const queueName = "name1";
  localQueue = new LocalQueue(queueName)
	localQueue.push(123);
	localQueue.push(456);
	localQueue.push(789);
	assert.deepStrictEqual(localQueue.getQueue(), [123, 456, 789]);

	assert.deepStrictEqual(localQueue.pop(2), [123, 456]);
	assert.deepStrictEqual(localQueue.getQueue(), [789]);

	assert.strictEqual(localQueue.isEmpty(), false);
});
