const { program } = require("commander")
const express = require("express")
const http = require("http")
const axios = require("axios")
const url = require("url")
const socketIO = require("socket.io")
const app = express()
const server = http.createServer(app)
const io = socketIO(server)
const fs = require("fs")
const jwt = require("jsonwebtoken")
const CryptoJS = require("crypto-js")
// Use a local queue or a redis queue
// E.g. const Queue = require('./redis-queue.js')
const Queue = require("./local-queue.js")
const db = require("./postgres-db")
const User = require("./user.js")
const Agreement = require("./agreement.js")
// const classLoader = require('./class_loader.js')
const ClassLoader = require("./class_loader.js")
// const config = require("./config.json")
const { userInfo } = require("os")
const UserDb = require("./UserDb.js")

require("dotenv").config()
const otreeIPs = process.env.OTREE_IPS.split(",")
const otreeRestKey = process.env.OTREE_REST_KEY
const apiKey = process.env.API_KEY
const secretKey = process.env.SECRET_KEY
const urlPass = process.env.URL_PASS
const keyWordArray = CryptoJS.enc.Base64.parse(apiKey)

program
  .option("-p, --port <int>", "server listen port.")
  .option("-c, --config <type>", "config file path.")
  .option("--reset-db", "reset users database.")
  .option("--db-file <type>", "user database file to use.")

program.parse(process.argv)
const options = program.opts()
const config = options.config
  ? require(options.config)
  : require("./config.json")

const port = options.port || "8060"
const userDbFile = options.dbFile || "./data/userdb.json"
//const publicKey = fs.readFileSync("./public-key.pem", "utf8")
//
/**
 *
 * @type {Set<string>}
 */
const usedUrls = new Set()
if (options.resetDb && fs.existsSync(userDbFile)) {
  console.log(`Deleting ${userDbFile} file!`)
  fs.unlinkSync(userDbFile)
}
/**
 *
 * @type {Map<`${userId}:${experimentId}`, User>}
 */
const usersDb = new UserDb(userDbFile)
let shuttingDown = 0
process.on("SIGINT", async () => {
  if (shuttingDown > 0) {
    return
  }
  shuttingDown = 1
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)")
  await usersDb.forceSave()
  setTimeout(() => {
    process.exit(0)
  }, 1000)
})

function getOrSetValue(obj, key, defaultValue) {
  if (!(key in obj)) {
    obj[key] = defaultValue
  }
  return obj[key]
}

function getOtreeUrls(otreeIPs, otreeRestKey) {
  return new Promise((resolve, reject) => {
    const config = {
      headers: {
        "otree-rest-key": otreeRestKey,
      },
    }
    const results = []
    // Get a map of promises for every REST call to the servers
    // then we can wait on all promises to resolve with Promise.all
    const outerPromises = otreeIPs.map((s) => {
      const apiUrl = `http://${s}/api/sessions`
      //console.log(`Calling ${apiUrl}`)
      return axios.get(apiUrl, config).then(async (res) => {
        // For every session on the server we call back to the server
        // to get more participant info. We do the same with promises
        // and wait on these internal promises resolve.
        const innerPromises = res.data.map((session) => {
          const code = session.code
          const experimentName = session.config_name
          const sessionUrl = apiUrl + "/" + code
          return axios.get(sessionUrl, config).then((res) => {
            res.data.participants.forEach((p) => {
              const experimentUrl = `http://${s}/InitializeParticipant/${p.code}`
              results.push({
                server: s,
                sessionCode: code,
                experimentName: experimentName,
                experimentUrl: experimentUrl,
              })
            })
          })
        }) //innerPromises
        // Wait for promises in the inner loop (map) to resolve before
        // moving to the next outer loop.
        try {
          await Promise.all(innerPromises)
        } catch (error) {
          reject(error)
        }
      })
    })
    Promise.all(outerPromises)
      .then(() => {
        //console.log(`${JSON.stringify(results,null,2)}`)
        resolve(results)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

// Put back experiment urls
function revertUrls(exp, urls, serverKey) {
  // console.log(`reverting ${urls}`)
  // console.log(`before ${JSON.stringify(Array.from(usedUrls))} ${exp.servers[serverKey].length}`)
  urls.forEach((url) => {
    usedUrls.delete(url)
    if (exp.servers[serverKey].includes(url)) {
      return
    }
    exp.servers[serverKey].push(url)
  })
  // console.log(`after ${JSON.stringify(Array.from(usedUrls))} ${exp.servers[serverKey].length}`)
}

function lastElement(arr) {
  return arr[arr.length - 1]
}

// Middleware to validate signature
const validateSignature = (req, res, next) => {
  const xSignature = req.headers["x-signature"]
  const dataToVerify = JSON.stringify(req.body)
  const dataWordArray = CryptoJS.enc.Utf8.parse(dataToVerify)
  const calculatedSignatureWordArray = CryptoJS.HmacSHA256(
    dataWordArray,
    keyWordArray,
  )
  const calculatedSignatureBase64 = CryptoJS.enc.Base64.stringify(
    calculatedSignatureWordArray,
  )
  if (calculatedSignatureBase64 === xSignature) {
    next()
  } else {
    res.status(401).json({ message: "Unauthorized: Invalid signature" })
  }
}

function getYmdDate(now) {
  // const now = new Date()
  let month = ("0" + (now.getMonth() + 1)).slice(-2)
  let day = ("0" + now.getDate()).slice(-2)
  return `${now.getFullYear()}${month}${day}`
}

function getHexSignature(dataToSign, secretKey) {
  const signatureWordArray = CryptoJS.HmacSHA256(dataToSign, secretKey)
  return CryptoJS.enc.Hex.stringify(signatureWordArray)
}

function _validateHmac(token, userId, experimentId) {
  // function getHexSignature(dataToSign, secretKey) {
  //   const signatureWordArray = CryptoJS.HmacSHA256(dataToSign, secretKey)
  //   return CryptoJS.enc.Hex.stringify(signatureWordArray)
  // }

  const today = getYmdDate(new Date())
  const yesterday = getYmdDate(new Date(Date.now() - 86400000))

  // console.log(`today: ${today}, yesterday: ${yesterday}.`)

  const respondent = userId
  const check = token

  // let dataToSign = `${respondent}:${today}:${experimentId}`
  // const signatureWordArray = CryptoJS.HmacSHA256(dataToSign, secretKey)
  // const signatureHex = CryptoJS.enc.Hex.stringify(signatureWordArray)
  todaySignature = getHexSignature(
    `${respondent}:${today}:${experimentId}`,
    secretKey,
  )
  yesterdaySignature = getHexSignature(
    `${respondent}:${yesterday}:${experimentId}`,
    secretKey,
  )

  if (todaySignature === check || yesterdaySignature === check) {
    return true
  }
  return false
}

function validatePass(req, res, next) {
  const pass = req.query.secret
  const hash = CryptoJS.SHA256(pass).toString(CryptoJS.enc.Hex)
  // console.log(`${hash} ${urlPass}`)
  if (hash == urlPass) {
    next()
  } else {
    res.status(401).json({ message: "Unauthorized: invalid signature" })
  }
}

// Middleware to validate signature
const validateHmac = (req, res, next) => {
  if (
    _validateHmac(
      req.query.check,
      req.query.respondent,
      req.params.experimentId,
    )
  ) {
    req.user = {
      userId: req.query.respondent,
      token: req.query.check,
      oTreeVars: {},
    }
    next()
  } else {
    res.status(401).json({ message: "Unauthorized: invalid signature" })
  }
}

// Middleware to validate JWT
// const validateToken = (req, res, next) => {
//   const token = req.query.token
//   if (!token) {
//     return res.status(401).json({ message: "Unauthorized: Missing token" })
//   }
//   jwt.verify(token, publicKey, { algorithm: ["RS256"] }, (err, decoded) => {
//     if (err) {
//       return res.status(401).json({ message: "Unauthorized: Invalid token" })
//     }
//
//     req.user = decoded // Attach user information to the request object
//     next()
//   })
// }

async function getExperimentUrls(experiments) {
  const expToEnable = config.experiments.map((e) => e.name)
  const usedUrlsFromDb = usersDb.getUsedUrls()

  // clear existing URLs first:
  for (const [_, val] of Object.entries(experiments)) {
    // console.log(JSON.stringify(val, null, 4))
    for (const [_, arr] of Object.entries(val.servers)) {
      arr.splice(0, arr.length)
    }
  }

  try {
    // Get oTree experiment URLs from servers
    otreeData = await getOtreeUrls(otreeIPs, otreeRestKey)
    // Build experiments object
    otreeData.forEach((r) => {
      const exp = getOrSetValue(experiments, r.experimentName, {
        name: r.experimentName,
        enabled: expToEnable.includes(r.experimentName),
        servers: {},
      })
      const serverPlusSession = `${r.server}#${r.sessionCode}`
      // const expUrls = getOrSetValue(exp.servers, r.server, [])
      const expUrls = getOrSetValue(exp.servers, serverPlusSession, [])
      //console.log(`expUrls ${expUrls} oTreeUrls: ${r.experimentUrl}`)
      if (
        expUrls.includes(r.experimentUrl) ||
        usedUrls.has(r.experimentUrl) ||
        usedUrlsFromDb.includes(r.experimentUrl)
      ) {
        return
      }
      expUrls.push(r.experimentUrl)
    })
  } catch (error) {
    console.log(
      `[ERROR] Failed to retrieve data from oTree server/s reason: ${error.message}`,
    )
  }
}

// Send agree event which will force users to agree before
// starting the game.
function agreeGame(users, uuid, agreement, usersDb) {
  for (let i = 0; i < users.length; i++) {
    const compoundKey = users[i]
    const user = usersDb.get(compoundKey)
    const sock = user.webSocket
    if (!sock) {
      console.error(`User ${user.userId} has not socket!`)
      return
    }
    sock.emit("agree", { uuid: uuid, timeout: agreement.timeout / 1000})
  }
}

function startReadyGames(experiments, agreementIds, usersDb) {
  for (const [experimentId, _] of Object.entries(experiments)) {
    const experiment = experiments[experimentId]
    const scheduler = experiment.scheduler
    if (!scheduler) {
      if (experiment.enabled) {
        console.error(
          `[ERROR] No scheduler set for experiment ${experimentId}. Check config.json.`,
        )
      }
      continue
    }

    let canMaybeScheduleNext = true
    while (canMaybeScheduleNext) {
      canMaybeScheduleNext = false
      const conditionObject = scheduler.checkConditionAndReturnUsers(
        experiments,
        usedUrls,
      )
      // Check if there are enough users to start the game
      if (conditionObject.condition) {
        //console.log(conditionObject)
        canMaybeScheduleNext = true
        //console.log("Enough users; waiting for agreement.")
        // Generate an agreement object which
        // waits for all users to 'agree' and
        // proceed to the game together
        const uuid = crypto.randomUUID()
        const gameUsersIds = conditionObject.users.map(
          (u) => `${u.userId}:${u.experimentId}`,
        )
        const agreement = new Agreement(
          uuid,
          experimentId,
          gameUsersIds,
          conditionObject.users.map((u) => u.redirectedUrl),
          conditionObject.server,
          experiment.agreementTimeout,
        )
        console.log(
          `New agreement: ${agreement.agreementId} ${JSON.stringify(gameUsersIds)}.`,
        )
        agreementIds[uuid] = agreement
        agreeGame(gameUsersIds, uuid, agreement, usersDb)
        // Agreement timeout function
        agreement.startTimeout(
          (agreement, agreedUsersIds, nonAgreedUsersIds) => {
            if (agreement.isAgreed()) {
              return
            }
            if (agreement.isBroken()) {
              revertUrls(
                experiments[agreement.experimentId],
                agreement.urls,
                agreement.server,
              )

              //console.log(agreedUsersIds)
              //console.log(nonAgreedUsersIds)

              //agreedUsersIds.forEach((userId) => {
              agreedUsersIds.forEach((compoundKey) => {
                // const compoundKey = `${userId}:${agreement.experimentId}`
                //console.log(`agree: ${compoundKey}`)
                const user = usersDb.get(compoundKey)
                user.changeState("queued")
              })
              //nonAgreedUsersIds.forEach((userId) => {
              nonAgreedUsersIds.forEach((compoundKey) => {
                // usersDb.dump()
                // const compoundKey = `${userId}:${agreement.experimentId}`
                //console.log(`Non agree: ${compoundKey}`)
                const user = usersDb.get(compoundKey)
                user.reset(2)
              })
            }
          },
        )
      } else {
        // Check if we have places on a server,
        // if no servers avaialble send users back to start screen
        // and empty experiment queue.
        if (
          conditionObject.waitForCount === 0 &&
          conditionObject.server === null
        ) {
          //console.warn(`[WARNING] Experiment ${experimentId} ran out of slots!`)
          scheduler.resetQueue()
          conditionObject.users.forEach((user) => {
            user.reset(3)
          })
        }
      }
    }
  }
}

async function main() {
  const experiments = {}
  // if (options.resetDb && fs.existsSync(userDbFile)) {
  //   console.log(`Deleting ${userDbFile} file!`)
  //   fs.unlinkSync(userDbFile)
  // }
  // /**
  //  *
  //  * @type {Map<`${userId}:${experimentId}`, User>}
  //  */
  // const usersDb = new UserDb(userDbFile)
  // Load database from file
  await usersDb.load()
  // Get used URLs from database
  const agreementIds = {}
  // Load URLs from oTree servers
  await getExperimentUrls(experiments)

  const expToEnable = config.experiments.map((e) => e.name)
  // Load schedulers from directory
  // initialize returns a new ClassLoader
  const SchedulerPlugins = await ClassLoader.initialize("./schedulers")

  try {
    // Go through each experiment config and
    // load the appropriate scheduler class and
    // attach it to the experiments object
    config.experiments.forEach((e) => {
      if (!experiments[e.name]) {
        experiments[e.name] = {
          name: e.name,
          enabled: expToEnable.includes(e.name),
          servers: {},
        }
      }
      if (!SchedulerPlugins.classExists(e.scheduler.type)) {
        throw new Error(`Class ${e.scheduler.type} not found!`)
      }
      experiments[e.name]["agreementTimeout"] = e.agreementTimeout
      // Instantiate a scheduler class and pass the queue to
      // be managed by the scheduler
      experiments[e.name]["scheduler"] = new (SchedulerPlugins.getClass(
        e.scheduler.type,
      ))(e.name, Queue, e.scheduler.params)
    })
  } catch (error) {
    console.log(`[ERROR] Failed to load scheduler/s ${error.message}`)
    process.exit(1)
  }

  // // Maybe only check for every new user queued instead on interval.
  // setInterval(async () => {
  //   await getExperimentUrls(experiments)
  //   startReadyGames(experiments, agreementIds, usersDb)
  // }, 1000)

  let lastUpdate = new Date()
  async function getUrlsAndStartGames(experiments, agreementIds, usersDb) {
    const now = new Date()
    const tDiff = Math.abs((now.getTime() - lastUpdate.getTime()) / 1000)
    if (tDiff > 30) {
      lastUpdate = now
      console.log(`Updating URLs. Last update was ${tDiff} seconds ago.`)
      await getExperimentUrls(experiments)
    }

    startReadyGames(experiments, agreementIds, usersDb)
  }

  console.log(`Experiments setup:\n${JSON.stringify(experiments, null, 2)}`)

  app.engine("html", require("ejs").renderFile)
  app.use(express.json())

  // Get oTree participant info using liss userId
  app.get(
    "/api/lissparticipants/:userId",
    validateSignature,
    async (req, res) => {
      function flatten(arr) {
        return arr.reduce(function (flat, toFlatten) {
          return flat.concat(
            Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten,
          )
        }, [])
      }
      const results = usersDb
        .find(req.params.userId)
        .map((u) => u.serialize())
        .filter((u) => u.redirectedUrl)
        .map(async (u) => {
          const participantUrl = u.redirectedUrl
          const parseUrl = url.parse(participantUrl)
          const participantCode = lastElement(parseUrl.pathname.split("/"))
          const sqlResults = await db.parQuery(`SELECT *
          FROM otree_participant 
          WHERE code = '${participantCode}'`)
          const nonEmpty = sqlResults.filter((r) => {
            return r.length !== 0
          })
          return nonEmpty
        })
      const vals = await Promise.all(results)
      res.status(201).json(flatten(vals))
    },
  )

  app.get(
    "/api/participants/:participantCode",
    validateSignature,
    async (req, res) => {
      const participantCode = req.params.participantCode
      const results = await db.parQuery(`SELECT *
      FROM otree_participant 
      WHERE code = '${participantCode}'`)
      const result = results.filter((r) => {
        return r.length !== 0
      })
      res.status(201).json(result)
    },
  )

  // Get all participants info
  app.get("/api/participants", validateSignature, async (req, res) => {
    const results = await db.parQuery(`SELECT * FROM otree_participant`)
    res.status(201).json([].concat(...results))
  })

  // Setup experiment server urls
  app.post(
    "/api/experiments/:experimentId",
    validateSignature,
    async (req, res) => {
      const experimentId = req.params.experimentId
      // const data = req.body
      const exp = experiments[experimentId]
      if (!exp) {
        res
          .status(404)
          .json({ message: `Experiment ${experimentId} not found!` })
        return
      }
      // Enable experiment
      exp.enabled = true
      res.status(201).json({ message: "Ok" })
    },
  )

  app.get(
    "/api/experiments/:experimentId",
    validateSignature,
    async (req, res) => {
      const experimentId = req.params.experimentId
      res.status(201).json(experiments[experimentId])
    },
  )

  app.delete(
    "/api/experiments/:experimentId",
    validateSignature,
    (req, res) => {
      const experimentId = req.params.experimentId
      delete experiments[experimentId]
      res.status(201).json({ message: `Queue ${experimentId} deleted.` })
    },
  )

  app.get("/api/experiments", validateSignature, async (req, res) => {
    //console.log("HEADERS: ", req.headers)
    res.status(201).json(experiments)
  })

  app.get("/urls/:experimentId/:noOfUrls?", validatePass, async (req, res) => {
    const today = getYmdDate(new Date())
    const host = req.get("host")
    const experimentId = req.params.experimentId
    const noOfUrls = req.params.noOfUrls || 5
    let users = []

    for (let i = 0; i < noOfUrls; i++) {
      users.push((30000 + i) * -1)
    }

    let htmlString = `<!doctype html><html><title>${experimentId} Urls</title><body>`
    users
      .map((u) => {
        const token = getHexSignature(
          `${u}:${today}:${experimentId}`,
          secretKey,
        )
        return `http://${host}/room/${experimentId}?respondent=${u}&check=${token}`
      })
      .forEach((url) => {
        htmlString += `<a href="${url}" target="_blank">${url}</a></br>`
      })
    htmlString += "</body></html>"

    res.status(201).send(htmlString)
  })

  app.get("/room/:experimentId", validateHmac, async (req, res) => {
    const params = req.user
    const userId = params.userId
    // Check if token parameter matches url
    // if (params.experimentId !== req.params.experimentId) {
    //   console.log("[WARN] token experimentId and url do not match!")
    //   res.status(404).sendFile(__dirname + "/webpage_templates/404.html")
    //   return
    // }

    // Check if experiment exists
    params.experimentId = req.params.experimentId
    const exp = experiments[params.experimentId]
    if (!exp || !exp.enabled) {
      console.log(`[WARN] experiment ${params.experimentId} not found!`)
      res.status(404).sendFile(__dirname + "/webpage_templates/404.html")
      return
    }
    const compoundKey = `${userId}:${params.experimentId}`
    const user =
      usersDb.get(compoundKey) || new User(userId, params.experimentId)
    user.tokenParams = params
    params.token = req.user.token
    //user.token = req.user.token
    usersDb.set(compoundKey, user)
    //console.log(`Token params: ${JSON.stringify(user.tokenParams)}`)
    if (
      fs.existsSync(
        __dirname + "/webpage_templates/" + params.experimentId + ".html",
      )
    ) {
      res.render(
        __dirname + "/webpage_templates/" + params.experimentId + ".html",
        params,
      )
    } else {
      res.render(__dirname + "/webpage_templates/default.html", params)
    }
  })

  io.on("connection", (socket) => {
    //console.log('WS: connection')
    socket.on("landingPage", async (msg) => {
      const userId = msg.userId
      const experimentId = msg.experimentId
      if (!_validateHmac(msg.token, userId, experimentId)) {
        console.log(`User ${userId} invalid token ${msg.token}.`)
        socket.emit("tokenError", {
          errorMsg: "Token invalid!",
        })
        return
      }
      const compoundKey = `${userId}:${experimentId}`
      const user = usersDb.get(compoundKey) || new User(userId, experimentId)
      user.webSocket = socket

      // If user is queued and refreshes page then re-trigger
      // queued events.
      switch (user.state) {
        case "queued":
          user.changeState("queued")
          break
        case "inoTreePages":
          //const expUrl = user.redirectedUrl
          //socket.emit("gameStart", { room: expUrl.toString() })
          break
        case "agreed":
          break
        case "waitAgreement":
          break
        default:
          user.changeState("startedPage")
          user.reset(1)
          usersDb.set(compoundKey, user)
          console.log(
            `User ${userId} in state ${user.state} connected for experiment ${experimentId}.`,
          )
      }
    })
    socket.on("newUser", async (msg) => {
      let userId = msg.userId
      const experimentId = msg.experimentId
      if (!_validateHmac(msg.token, userId, experimentId)) {
        console.log(`User ${userId} invalid token ${msg.token}.`)
        socket.emit("tokenError", {
          errorMsg: "Token invalid!",
        })
        return
      }
      const compoundKey = `${userId}:${experimentId}`
      let user = usersDb.get(compoundKey)

      if (!user) {
        console.error(`No user ${userId} found!`)
        return
      }
      user.webSocket = socket
      // if (user.state === "queued") {
      //   user.changeState("queued")
      //   //console.log(`User ${userId} already queued`)
      //   return
      // }
      if (user.state === "waitAgreement") {
        // User is waiting in an agreement
        // console.log(`${userId} in state ${user.state}.`)
        return
      }
      if (user.state === "agreed") {
        // User is waiting in an agreement
        // console.log(`${userId} in state ${user.state}.`)
        return
      }
      if (user.state === "inoTreePages") {
        //console.log(`User ${userId} already already redirected`)
        socket.emit("gameStart", { room: user.redirectedUrl.toString() })
        return
      }
      // console.log(`${userId} in state ${user.state}.`)

      // console.log(`NEw user: ${user.userId} ${user.state}`)
      user.addListenerForState("queued", async (user, state) => {
        const userId = user.userId
        const experimentId = user.experimentId
        const experiment = experiments[experimentId]
        if (!experiment) {
          console.log(
            `[WARN] no experiment object found for ${experimentId} and user ${userId}`,
          )
        }
        const scheduler = experiment.scheduler
        await scheduler.queueUser(user)
        // Condition object returns
        // {
        //  condition: true|false
        //  users: [] of type Users
        //  waitForCount: int
        // }
        //console.log(`User ${userId} in event listener in state ${state}`)

        // User state can switch between start of function and here
        // e.g. to agree state. So double check again
        if (user.state === "queued") {
          user.webSocket.emit("wait", {
            playersToWaitFor: scheduler.playersToWaitFor(),
            maxPlayers: scheduler.minPlayersNeeded(),
          })
        }
        scheduler.signalUsers()
      }) //addListenerForState
      user.changeState("queued")
      getUrlsAndStartGames(experiments, agreementIds, usersDb)
    }) //newUser

    // User sends agreement to start game
    socket.on("userAgreed", (data) => {
      //console.log("[SOCKET][userAgreed] ", data)
      const userId = data.userId
      const uuid = data.uuid
      const experimentId = data.experimentId
      const compoundKey = `${userId}:${experimentId}`

      const agreement = agreementIds[uuid]
      if (!agreement) {
        console.log(`[ERROR] no agreement ${uuid}`)
        return
      }
      usersDb.get(compoundKey).changeState("agreed")
      // If everyone agrees, start game
      if (agreement.agree(compoundKey)) {
        console.log(`Start Game! agreement ${agreement.agreementId}.`)
        startGame(
          agreement.agreedUsers,
          agreement.urls,
          agreement.experimentId,
          agreement.agreementId,
        )
      }
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      //console.log("User disconnected")
    })
  })

  // Function to start the game with the specified users
  /**
   *
   * @param users {string[]}
   * @param urls {string[]}
   */
  function startGame(users, urls, experimentId, agreementId) {
    console.log(`Starting game with users: ${users} and urls ${urls}.`)
    // Set copyVars to true if you want to send variables to oTree before redirect
    // e.g. lobby_id
    const copyVars = true
    for (let i = 0; i < users.length; i++) {
      const userId = users[i]
      // const compoundKey = `${userId}:${experimentId}`
      const compoundKey = userId
      const user = usersDb.get(compoundKey)
      user.changeState("redirected")
      const expUrl = new URL(urls[i])
      // Set user variables on oTree server
      // Vars in oTree experiment template are accessed using
      // the syntax {{ player.participant.vars.age }} where age is a var
      const oTreeVars = user.tokenParams?.oTreeVars || {}
      oTreeVars["lobby_id"] = agreementId
      function redirect() {
        const sock = user.webSocket
        // Emit a custom event with the game room URL
        user.experimentUrl = expUrl
        user.groupId = agreementId
        user.redirectedUrl = `${expUrl}?participant_label=${user.userId}`
        user.changeState("inoTreePages")
        sock.emit("gameStart", { room: user.redirectedUrl })
        console.log(`Redirecting user ${user.userId} to ${user.redirectedUrl}`)
      }
      if (!copyVars) {
        //We do not need to update vars on oTree anymore since they are not coming
        //through the url encoding
        redirect()
      } else {
        // First update user variables on oTree server
        // then redirect
        const config = {
          headers: {
            "otree-rest-key": otreeRestKey,
          },
        }
        const participantCode = expUrl.pathname.split("/").pop()
        const apiUrl = `http://${expUrl.host}/api/participant_vars/${participantCode}`
        axios
          .post(apiUrl, { vars: oTreeVars }, config)
          .then((_) => {
            console.log(
              `Updated ${userId} vars for participant ${participantCode} with ${JSON.stringify(oTreeVars)}`,
            )
            redirect()
          })
          .catch((_) => {
            console.log(
              `Error updating ${userId} vars for participant ${participantCode}.`,
            )
          })
      } // copyVars
    }
    // Save users to file with the new redirected urls
    usersDb.save()
  }

  // Start the server
  server.listen(port, () => {
    console.log("Waiting room listening on port: ", port)
  })
}

main()
