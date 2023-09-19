const express = require('express')
const http = require('http')
const url = require('url')
const socketIO = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const queue = require('./redis-queue.js')

const config = require('./config.json')
const port = 8060

function getValue(obj, key, defaultValue) {
  if(!(key in obj)) {
    obj[key] = defaultValue
  }
  return obj[key]
}

function findUrls(exp, minUrls) {
  keys = Object.keys(exp.servers).filter(k => {
    return (exp.servers[k].length >= minUrls)
  })
  if(keys.length > 0) {
    urls = exp.servers[keys[0]].splice(0, minUrls)
    return {
      server: keys[0],
      urls: urls
    }
  }
  return null
}

async function main() {

  const matchUsers = 3
  const experiments = {}
  const sockets = {}

  app.engine('html', require('ejs').renderFile);
  app.use(express.json());

  // Setup experiment server urls
  app.post('/experiment/:experimentId', async (req, res) => {
    const experimentId = req.params.experimentId
    const data = req.body
    exp = getValue(experiments, experimentId, { 'servers': {} })
    data.urls.map(s => {
      return new URL(s)
    }).forEach(u => {
      expUrls = getValue(exp.servers, u.hostname, [])
      if(expUrls.includes(u)) {
        return
      } else {
        expUrls.push(u)
      }
    })

    //console.log(JSON.stringify(experiments, null, 2))

    res.status(201).json({ message: 'Data received successfully.' });
  })

  app.delete('/experiment/:experimentId', (req, res) => {
    queue.deleteQueue(experimentId).then(() => {
      res.status(201).json({message: `Queue ${experimentId} deleted.`})
    })
  })

  // Serve the HTML page
  app.get('/experiment/:experimentId', async (req, res) => {
    const experimentId = req.params.experimentId
    const userId = req.query.userId
    res.render(__dirname + '/index.html', {
        "experimentId": experimentId,
        "userId": userId
      });
  });

  io.on('connection', (socket) => {
    socket.on('newUser', async (msg) => {
      userId = msg.userId
      experimentId = msg.experimentId
      // Save socket
      sockets[userId] = socket
      console.log(`User ${userId} connected for experiment ${experimentId}.`);
      queuedUsers = await queue.pushAndGetQueue(experimentId, userId)

      // Check if there are enough users to start the game
      if (queuedUsers.length >= matchUsers) {
        const gameUsers = await queue.pop(experimentId, matchUsers)
        expUrls = findUrls(experiments[experimentId], matchUsers)
        if(expUrls){
          console.log("Starting game!")
          startGame(gameUsers, expUrls.urls);
        } else {
          console.log("No servers found!")
        }
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected');
      //removeFromQueue(socket);
    });

  });

  // Function to remove a user from the waiting queue
  function removeFromQueue(user) {
    const index = waitingUsers.indexOf(user);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
    }
  }

  // Function to start the game with the specified users
  function startGame(users, urls) {
    console.log(`Starting game with users: ${users} and urls ${urls}.`);
    for (let i = 0; i < users.length; i++) {
      user = users[i]
      expUrl = urls[i]
      sock = sockets[user]
      // Emit a custom event with the game room URL
      sock.emit('gameStart', { room: expUrl }); 
    }
  }

  // Start the server
  server.listen(port, () => {
    console.log('Waiting room listening on port: ', port);
  });

}

main()
