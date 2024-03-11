const test = require("node:test");
const assert = require("node:assert");
const localQueue = require("../local-queue")

test("test local queue", () => {
	const queueName = "name1";
	localQueue.push(queueName, 123);
	localQueue.push(queueName, 456);
	localQueue.push(queueName, 789);
	assert.deepStrictEqual(localQueue.getQueue(queueName), [123, 456, 789]);

	assert.deepStrictEqual(localQueue.pop(queueName, 2), [123, 456]);
	assert.deepStrictEqual(localQueue.getQueue(queueName), [789]);

	assert.strictEqual(localQueue.isEmpty(queueName), false);
	assert.strictEqual(localQueue.isEmpty("name2"), true);
});
