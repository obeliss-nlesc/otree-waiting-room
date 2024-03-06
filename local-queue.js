const queues = new Map()


// Get or create queue
function getOrCreateQueue(queueName) {
  if (!queues.has(queueName)) {
    queues.set(queueName, new Array())
  }
  return queues.get(queueName)
}

// Enqueue an item to the queue
function push(queueName, item) {
  q = getOrCreateQueue(queueName)
  if (!q.includes(item)) {
    q.push(item)
  }
}

// Enqueue an item to the queue and get the queue
function pushAndGetQueue(queueName, item) {
  q = getOrCreateQueue(queueName)
  if (!q.includes(item)) {
    q.push(item)
  }
  return q
}

// Dequeue an item from the queue
function pop(queueName, count = 1) {
  q = getOrCreateQueue(queueName)
  if (q.length < count) {
    return []
  }
  return q.splice(q.length - count, q.length)
}

function deleteQueue(queueName) {
  queues[queueName] = []
}

function getQueue(queueName) {
  return getOrCreateQueue(queueName)
}

// Function to check if a queue is empty
function isEmpty(queueName) {
  q = getOrCreateQueue(queueName)
  return q.length === 0
}

function size(queueName) {
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
