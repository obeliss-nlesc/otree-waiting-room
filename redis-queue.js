const Redis = require('ioredis');

// Read .env file for env variables
require('dotenv').config();
const redisHost = process.env.REDIS_HOST

// Create a Redis client
const redis = new Redis(redisHost);

// Enqueue an item to the queue
async function push(queueName, item) {
  // Check if the element already exists in the list
  const exists = await redis.lpos(queueName, item);
  if(exists === null) {
    await redis.rpush(queueName, item);
  }
}

// Enqueue an item to the queue and get the queue
async function pushAndGetQueue(queueName, item) {
  // Check if the element already exists in the list
  const exists = await redis.lpos(queueName, item);
  if(exists === null) {
    await redis.rpush(queueName, item);
  }
  return redis.lrange(queueName, 0, -1);
}

// Dequeue an item from the queue
async function pop(queueName, count = 1) {
  return await redis.lpop(queueName, count);
}

async function deleteQueue(queueName) {
  return await redis.del(queueName)
}

async function getQueue(queueName) {
  const queueElements = await redis.lrange(queueName, 0, -1);
  return queueElements
}

// Function to check if a queue is empty
async function isEmpty(queueName) {
  const queueLength = await redis.llen(queueName);
  return queueLength === 0;
}

async function size(queueName) {
  return await redis.llen(queueName);
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
