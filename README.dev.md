
## Using Redis queue option
By default the waiting room uses a local queue. To switch to Redis, first:
Change line of code in server.js
```javascript
const queue = require('./local-queue.js')
```
to
```javascript
const queue = require('./redis-queue.js')
```
also the queue._ commands in server.js need to be awaited. Search the comments for Redis e.g. changing
```javascript
let queuedUsers = queue.pushAndGetQueue(experimentId, userId)
```
to
```javascript
let queuedUsers = await queue.pushAndGetQueue(experimentId, userId)
```
then run a Redis server e.g. with Docker
```shell
docker run --detach redis:7.2.4
```
then rerun the env setup
```shell
node set_env.js > .env
```
