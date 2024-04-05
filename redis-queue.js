const Redis = require("ioredis")
// Read .env file for env variables
require("dotenv").config()

class RedisQueue {
  constructor(queueName) {
    const redisHost = process.env.REDIS_HOST
    // Create a Redis client
    this.redis = new Redis(redisHost)
    this.queueName = queueName
  }

  async reset() {
    await this.redis.del(this.queueName)
  }

  async push(item) {
    const exists = await this.redis.lpos(this.queueName, item)
    if (exists === null) {
      await redis.rpush(this.queueName, item)
    }
  }

  async pushAndGetQueue(item) {
    // Check if the element already exists in the list
    const exists = await this.redis.lpos(this.queueName, item)
    if (exists === null) {
      await redis.rpush(this.queueName, item)
    }
    return redis.lrange(this.queueName, 0, -1)
  }

  async pop(count) {
    return await this.redis.lpop(this.queueName, count)
  }

  async getQueue() {
    return await this.redis.lrange(this.queueName, 0, -1)
  }

  async isEmpty() {
    const queueLength = await this.redis.llen(this.queueName)
    return queueLength === 0
  }

  async size() {
    return await this.redis.llen(this.queueName)
  }
}

module.exports = RedisQueue
