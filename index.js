const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const config = require('./config.json')

const waitingUsers = [];
const serverQueue = createServerQueue(config)
const serversInUse = []
const matchUsers = 3

console.log(serverQueue)

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('New user connected');

  url = serverQueue.pop()
  // Add user to the waiting queue
  waitingUsers.push({'socket': socket, 'url': url});
  serversInUse.push(url)

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
    removeFromQueue(socket);
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
server.listen(3000, () => {
  console.log('Server listening on port 3000');
});



