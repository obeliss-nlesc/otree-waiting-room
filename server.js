const express = require('express')
const http = require('http')
const axios = require('axios')
const url = require('url')
const socketIO = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const fs = require('fs')
const queue = require('./redis-queue.js')
const db = require('./postgres-db')

require('dotenv').config();
const otreeIPs = process.env.OTREE_IPS.split(",")
const otreeRestKey = process.env.OTREE_REST_KEY
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

function lastElement(arr) {
  return arr[arr.length -1]
}

async function main() {

  const matchUsers = 3
  const experiments = {}
  const sockets = {}
  const userMapping = {}

  app.engine('html', require('ejs').renderFile);
  app.use(express.json());

  // Get participant info
  app.get('/api/participants/:userId', async (req, res) => {
    const participantUrl = userMapping[req.params.userId]
    if(!participantUrl) {
      res.status(404).json({message: `${req.params.userId} not found.`})
      return
    }
    const parseUrl = url.parse(participantUrl)
    const hostname = parseUrl.hostname
    const participantCode = lastElement(parseUrl.pathname.split('/'))
    results = await db.parQuery(`SELECT
      code, 
      _session_code, 
      _current_page_name, 
      _index_in_pages,
      _last_page_timestamp,
      _last_request_timestamp
      FROM otree_participant 
      WHERE code = '${participantCode}'`)
    result = results.filter(r => {
      if (r.length == 0) return false
      return true
    })
    res.status(201).json(result)
  })
  
  // Get all participants info
  app.get('/api/participants', async (req, res) => {
    results = await db.parQuery(`SELECT 
      code, 
      _session_code, 
      _current_page_name, 
      _index_in_pages,
      _last_page_timestamp,
      _last_request_timestamp
      FROM otree_participant`)
    //results = await db.parQuery('SELECT * FROM otree_participant')
    res.status(201).json([].concat(...results))
  })

  // Setup experiment server urls
  app.post('/api/experiments/:experimentId', async (req, res) => {
    const experimentId = req.params.experimentId
    const data = req.body
    exp = getValue(experiments, experimentId, { 'servers': {} })
    
    experiments[experimentId]['config'] = data
    otreeIPs.forEach(s => {
      const config = {
        headers: {
          'otree-rest-key': otreeRestKey
        }
      }
      const apiUrl = `http://${s}/api/sessions`
      const expUrls = getValue(exp.servers, s, [])
      axios.get(apiUrl, config)
        .then(res => {
          res.data.forEach(session => {
            const code = session.code
            const expName = session.config_name
            if(expName != experimentId) {
              return
            }
            const sessionUrl = apiUrl + '/' + code
            // Query sessions for participants
            axios.get(sessionUrl, config)
              .then(res => {
                res.data.participants.forEach(p => {
                  //console.log(`Particpant ${p.code} in experiment ${expName} session ${code} on server ${s}.`)
                  expUrls.push(`http://${s}/InitializeParticipant/${p.code}`)
                })
              })
              .catch(error => {
                console.error(error)
              })
          })
        })
        .catch(error => {
          console.error(error)
        })
    })
    
    res.status(201).json({ message: "Ok"})
  })

  app.get('/api/experiments/:experimentId', async (req, res) => {
    const experimentId = req.params.experimentId
    res.status(201).json(experiments[experimentId])
  })

  app.delete('/api/experiments/:experimentId', (req, res) => {
    queue.deleteQueue(experimentId).then(() => {
      res.status(201).json({message: `Queue ${experimentId} deleted.`})
    })
  })

  app.get('/api/experiments', async (req, res) => {
    res.status(201).json(experiments)
  })

  app.get('/room/:experimentId', async (req, res) => {
    const experimentId = req.params.experimentId
    const userId = req.query.userId
    if (fs.existsSync(__dirname + "/" + experimentId)) {
      res.render(__dirname + '/' + experimentId + '/index.html', {
          "experimentId": experimentId,
          "userId": userId
        });
    } else {
      res.render(__dirname + '/default/index.html', {
          "experimentId": experimentId,
          "userId": userId
        });
    }
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
    });

  });

  // Function to start the game with the specified users
  function startGame(users, urls) {
    console.log(`Starting game with users: ${users} and urls ${urls}.`);
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const expUrl = urls[i]
      userMapping[user] = expUrl
      const sock = sockets[user]
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
