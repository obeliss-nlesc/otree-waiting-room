const express = require('express')
const http = require('http')
const axios = require('axios')
const url = require('url')
const socketIO = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const fs = require('fs')
const jwt = require('jsonwebtoken')
const CryptoJS = require('crypto-js')
const queue = require('./redis-queue.js')
const db = require('./postgres-db')
const User = require('./user.js')
const Agreement = require('./agreement.js')


require('dotenv').config();
const otreeIPs = process.env.OTREE_IPS.split(",")
const otreeRestKey = process.env.OTREE_REST_KEY
const apiKey = process.env.API_KEY
const keyWordArray = CryptoJS.enc.Base64.parse(apiKey)
const port = 8060
const publicKey = fs.readFileSync('./public-key.pem', 'utf8')


function getValue(obj, key, defaultValue) {
  if(!(key in obj)) {
    obj[key] = defaultValue
  }
  return obj[key]
}

// Get experiment urls from server and experiment
function findUrls(exp, minUrls) {
  const keys = Object.keys(exp.servers).filter(k => {
    return (exp.servers[k].length >= minUrls)
  })
  if(keys.length > 0) {
    const urls = exp.servers[keys[0]].splice(0, minUrls)
    return {
      server: keys[0],
      urls: urls
    }
  }
  return null
}

// Put back experiment urls 
function revertUrls(exp, urls, serverKey) {
  urls.forEach(url => {
    if (exp.servers[serverKey].includes(url)) {
      return
    }
    exp.servers[serverKey].push(url)
  })
}

function lastElement(arr) {
  return arr[arr.length -1]
}
// Middleware to validate signature
const validateSignature = (req, res, next) => {
  const xSignature = req.headers['x-signature']
  const dataToVerify = JSON.stringify(req.body);
  const dataWordArray = CryptoJS.enc.Utf8.parse(dataToVerify);
  const calculatedSignatureWordArray = CryptoJS.HmacSHA256(dataWordArray, keyWordArray);
  const calculatedSignatureBase64 = CryptoJS.enc.Base64.stringify(calculatedSignatureWordArray);
  if(calculatedSignatureBase64 == xSignature) {
    next()
  } else {
    res.status(401).json({ message: 'Unauthorized: Invalid signature'})
  }
};

// Middleware to validate JWT
const validateToken = (req, res, next) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Missing token' });
  }
  jwt.verify(token, publicKey, {algorithm: ['RS256']}, (err, decoded) => {
    if (err) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
          }

    req.user = decoded; // Attach user information to the request object
    next();
  });
};


async function main() {
  const matchUsers = 3
  const experiments = {}
  //const sockets = {}
  const usersDb = {}
  const userMapping = {}
  const agreementIds = {}

  app.engine('html', require('ejs').renderFile);
  app.use(express.json());

  // Get participant info
  app.get('/api/participants/:userId', validateSignature, async (req, res) => {
    const participantUrl = userMapping[req.params.userId]
    if(!participantUrl) {
      res.status(404).json({message: `${req.params.userId} not found.`})
      return
    }
    const parseUrl = url.parse(participantUrl)
    //const hostname = parseUrl.hostname
    const participantCode = lastElement(parseUrl.pathname.split('/'))
    const results = await db.parQuery(`SELECT
      code, 
      _session_code, 
      _current_page_name, 
      _index_in_pages,
      _last_page_timestamp,
      _last_request_timestamp
      FROM otree_participant 
      WHERE code = '${participantCode}'`)
    const result = results.filter(r => {
      if (r.length == 0) return false
      return true
    })
    res.status(201).json(result)
  })
  
  // Get all participants info
  app.get('/api/participants', validateSignature, async (req, res) => {
    const results = await db.parQuery(`SELECT 
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
  app.post('/api/experiments/:experimentId', validateSignature, async (req, res) => {
    const experimentId = req.params.experimentId
    const data = req.body
    const exp = getValue(experiments, experimentId, { 'servers': {} })
    
    experiments[experimentId]['config'] = data
    // Delete queue for experiment
    queue.deleteQueue(experimentId)

    otreeIPs.forEach(s => {
      const config = {
        headers: {
          'otree-rest-key': otreeRestKey
        }
      }
      const apiUrl = `http://${s}/api/sessions`
      const expUrls = getValue(exp.servers, s, [])
      // Probe oTree servers API to get sessions
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

  app.get('/api/experiments/:experimentId', validateSignature, async (req, res) => {
    const experimentId = req.params.experimentId
    res.status(201).json(experiments[experimentId])
  })

  app.delete('/api/experiments/:experimentId', validateSignature, (req, res) => {
    const experimentId = req.params.experimentId
    queue.deleteQueue(experimentId).then(() => {
      res.status(201).json({message: `Queue ${experimentId} deleted.`})
    })
  })

  app.get('/api/experiments', validateSignature, async (req, res) => {
    console.log('HEADERS: ', req.headers)


    res.status(201).json(experiments)
  })

  app.get('/room/:experimentId', validateToken, async (req, res) => {
    const params = req.user
    params.experimentId = req.params.experimentId
    if (fs.existsSync(__dirname + "/" + params.experimentId)) {
      res.render(__dirname + '/' + params.experimentId + '/index.html', params);
    } else {
      res.render(__dirname + '/default/index_template.html', params);
    }
  });

  io.on('connection', (socket) => {
    socket.on('landingPage', async (msg) => {
      const userId = msg.userId
      const experimentId = msg.experimentId
      const user = usersDb[userId] || new User(userId, experimentId)
      user.webSocket = socket
      // If user is queued an refreshes page then re-trigger
      // queued events.
      if (user.state == 'queued') {
        console.log(`User ${userId} already in state ${user.state}.`)
        user.changeState('queued');
        return
      }
      user.changeState('startedPage')
      user.reset()
      usersDb[userId] = user
      console.log(`User ${userId} connected for experiment ${experimentId}.`);
    })
    socket.on('newUser', async (msg) => {
      let userId = msg.userId
      let user = usersDb[userId]

      if (!user) {
        console.error(`No user ${userId} found!`)
        return
      }
      user.webSocket = socket
      if (user.state == "queued") {
        console.log(`User ${userId} already queued`)
        return
      }

      user.addListenerForState("queued", async (user, state) => {
        let userId = user.userId
        let experimentId = user.experimentId
        let queuedUsers = await queue.pushAndGetQueue(experimentId, userId)

        console.log(`User ${userId} in event listener in state ${state}`)

        // Check if there are enough users to start the game
        if (queuedUsers.length >= matchUsers) {
          const gameUsers = await queue.pop(experimentId, matchUsers)
          const expUrls = findUrls(experiments[experimentId], matchUsers)
          console.log("Enough users; waiting for agreement.")
          const uuid = crypto.randomUUID();
          const agreement = new Agreement(uuid, 
            experimentId,
            gameUsers,
            expUrls.urls,
            expUrls.server
          )
          agreementIds[uuid] = agreement;
          agreeGame(gameUsers, uuid, agreement);
          // Agreement timeout function
          agreement.startTimeout((agreement, agreedUsers, nonAgreedUsers) => {
            if (agreement.isAgreed()) {
              return
            }
            if (agreement.isBroken()){
              revertUrls(experiments[agreement.experimentId], agreement.urls, agreement.server)
              agreedUsers.forEach(userId => {
                user = usersDb[userId]
                user.changeState('queued')
              })
              nonAgreedUsers.forEach(userId => {
                user = usersDb[userId]
                user.reset()
              })
            }
        })
        } else {
          let queuedUsers = await queue.getQueue(experimentId)
          let playersToWaitFor = matchUsers - queuedUsers.length;
          user.webSocket.emit("wait", { 
            playersToWaitFor: playersToWaitFor, 
            maxPlayers: matchUsers
          })
          queuedUsers.forEach(userId => {
            user = usersDb[userId]
            if (!user) {
              console.error(`User ${userId} not found!`)
              return
            }
            const sock = user.webSocket
            if (!sock) {
              console.error(`Socket for ${userId} not found!`)
              return
            }
            sock.emit('queueUpdate',{
              playersToWaitFor: playersToWaitFor, 
              maxPlayers: matchUsers
            })
          })
        }//else
      })//addListenerForState
      user.changeState("queued");
    })//newUser

    // User sends agreement to start game
    socket.on('userAgreed', (data) => {
      console.log("[SOCKET][userAgreed] ", data)
      const userId = data.userId
      const uuid = data.uuid

      const agreement = agreementIds[uuid]
      if(!agreement) {
        console.log(`[ERROR] no agreement ${uuid}`)
        return
      }
      // If everyone agrees, start game
      if(agreement.agree(userId)) {
        console.log("Start Game!")
        startGame(agreement.agreedUsers, agreement.urls)
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });

  });

  // Send agree event which will force users to agree before
  // starting the game.
  function agreeGame(users, uuid, agreement) {
    for (let i = 0; i < users.length; i++) {
      const userId = users[i]
      const user = usersDb[userId]
      const sock = user.webSocket
      if(!sock) {
        console.error(`User ${userId} has not socket!`);
        return
      }
      sock.emit('agree', {uuid: uuid, timeout: agreement.timeout}); 
    }
  }

  // Function to start the game with the specified users
  function startGame(users, urls) {
    console.log(`Starting game with users: ${users} and urls ${urls}.`);
    for (let i = 0; i < users.length; i++) {
      const userId = users[i]
      const user = usersDb[userId]
      const expUrl = urls[i]
      userMapping[userId] = expUrl
      const sock = user.webSocket
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
