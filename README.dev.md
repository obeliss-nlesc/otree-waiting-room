## Using Redis queue option

By default, the waiting room uses a local queue. To switch to Redis, first:
Change line of code in server.js

```javascript
const queue = require("./local-queue.js")
```

to

```javascript
const queue = require("./redis-queue.js")
```

also the queue.\_ commands in server.js need to be awaited. Search the comments for Redis e.g. changing

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

## Unit tests

The unit tests can be found in the `test` directory. They use Node.js built-in [testing API](https://nodejs.org/docs/latest-v20.x/api/test.html) and [assertion API](https://nodejs.org/docs/latest-v20.x/api/assert.html), which requires Node 20. To run the rests, run the following at the root of the project:

```shell
npm run test
```

The current tests are to test the local queue implementation in `local-queue.js`. More tests will be added later.
