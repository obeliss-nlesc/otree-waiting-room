const { weightSrvRecords } = require("ioredis/built/cluster/util")

const queues = {}

// Get or create queue
function getOrCreateQueue(queueName) {
  q = null
  if (!(queueName in queues)) {
    q = []
    queues[queueName] = q 
  } else {
    q = queues[queueName]
  }
  return q
}

// Enqueue an item to the queue
async function push(queueName, item) {
  q = getOrCreateQueue(queueName)
  q.push(item)
}

// Enqueue an item to the queue and get the queue
async function pushAndGetQueue(queueName, item) {
  q = getOrCreateQueue(queueName)
  // Check if the element already exists in the list
  if (!(item in q)) {
    q.push(item)
  }
  return q
}

// Dequeue an item from the queue
async function pop(queueName, count = 1) {
  q = getOrCreateQueue(queueName)
  if (q.length < count) {
    return []
  }
  return q.splice(q.length - count, q.length)
}

async function deleteQueue(queueName) {
  queues[queueName] = []
}

async function getQueue(queueName) {
  return getOrCreateQueue(queueName)
}

// Function to check if a queue is empty
async function isEmpty(queueName) {
  q = getOrCreateQueue(queueName)
  return q.length === 0
}

async function size(queueName) {
  q = getOrCreateQueue(queueName)
  return q.length
}

module.exports = {
  push,
  pop,
  isEmpty,
  size,
  getQueue,
  deleteQueue,
  pushAndGetQueue
}
