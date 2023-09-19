const express = require('express')
const http = require('http')
const socketIO = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const queue = require('./redis-queue.js')

const config = require('./config.json')
const port = 8060

async function main() {

  const waitingUsers = []
  const serverQueue = createServerQueue(config)
  const serversInUse = []
  const matchUsers = 3

  app.engine('html', require('ejs').renderFile);
  app.use(express.json());

  // Setup experiment server urls
  app.post('/experiment/:experimentId', async (req, res) => {
    const experimentId = req.params.experimentId
    const data = req.body
    console.log(experimentId)
    console.log(data.servers)
    res.status(201).json({ message: 'Data received successfully' });
  })

  // Serve the HTML page
  app.get('/experiment/:experimentId', async (req, res) => {
    const experimentId = req.params.experimentId
    const userId = req.query.userId
    //await queue.deleteQueue(experimentId)
    res.render(__dirname + '/index.html', {
        "experimentId": experimentId,
        "userId": userId
      });
  });

  io.on('connection', (socket) => {
    socket.on('newUser', async (msg) => {
      userId = msg.userId
      experimentId = msg.experimentId
      console.log(`User ${userId} connected for experiment ${experimentId}.`);
      queuedUsers = await queue.pushAndGetQueue(experimentId, userId)
      console.log(queuedUsers)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected');
      //removeFromQueue(socket);
    });

    // Check if there are enough users to start the game
    if (waitingUsers.length >= matchUsers) {
      const gameUsers = waitingUsers.splice(0, matchUsers);
      startGame(gameUsers);
    }
  });

  // Function to remove a user from the waiting queue
  function removeFromQueue(user) {
    const index = waitingUsers.indexOf(user);
    if (index !== -1) {
      waitingUsers.splice(index, 1);
    }
  }

  // Function to start the game with the specified users
  function startGame(users) {
    console.log('Starting game with users:', users.map(user => user.socket.id));
    // Implement your game logic here

    // Emit a custom event to redirect users to the game room
    users.forEach((user) => {
      user.socket.emit('gameStart', { room: user.url }); // Emit a custom event with the game room URL
    });
  }

  function createServerQueue(config) {
    allExp = config.servers.map(server => {
      return server.experiments
    })
    allUrls = allExp.map(exp => {
      return exp[0]['urls']
    })
    return [].concat(...allUrls)
  }

  // Start the server
  server.listen(port, () => {
    console.log('Waiting room listening on port: ', port);
  });

}

main()
