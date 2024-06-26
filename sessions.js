const { program } = require("commander")
const axios = require("axios")

require("dotenv").config()
const otreeIPs = process.env.OTREE_IPS.split(",")
const otreeRestKey = process.env.OTREE_REST_KEY

// program
//   .option("-s, --sessionConfigName <type>", "session config name.")
//   .option("-n, --numParticipants <int>", "number of participants.")
//
program
  .command("list <name>")
  .description("Show an session urls.")
  .option("--count", "Count urls.")
  .option("--sessions", "List session names urls.")
  .option("--urls", "List only urls.")

  .action(async (name, options) => {
    const results = [...(await getOtreeUrls(otreeIPs, otreeRestKey))].filter(
      (r) => {
        return r.experimentName == name
      },
    )

    if (options.urls) {
      const urls = results.map((r) => {
        return r.experimentUrl
      })
      console.log(urls)
      return
    }
    if (options.sessions) {
      const sessions = [
        ...new Set(
          results.map((r) => {
            return r.sessionCode
          }),
        ),
      ]
      const sessionCounts = sessions.map((s) => {
        const count = results.reduce((a, r) => {
          if (r.sessionCode == s) {
            a += 1
          }
          return a
        }, 0)
        return { name: s, count: count }
      })
      console.log(sessionCounts)
      return
    }

    if (options.count) {
      console.log(`Number of urls for ${name}: ${results.length}.`)
      return
    }

    // console.log(`Showing item: ${name}`);
    console.log(results)
  })

program
  .command("create <name>")
  .description("Create session.")
  .option("--num <size>", "Number of participants for session.", parseInt)
  .action(async (name, options) => {
    if (options.num) {
      const num = options.num
      console.log(`Creating ${num} of URLs for experiment ${name}.`)
      try {
        const results = await createSession(otreeIPs, otreeRestKey, name, num)
        console.log(results)
      } catch (err) {
        console.error(err)
      }
    } else {
      console.log(`Missing argument.`)
    }
  })

program.parse(process.argv)
const options = program.opts()

function getOrSetValue(obj, key, defaultValue) {
  if (!(key in obj)) {
    obj[key] = defaultValue
  }
  return obj[key]
}

function createSession(
  otreeIPs,
  otreeRestKey,
  sessionConfigName,
  numParticipants,
) {
  return new Promise((resolve, reject) => {
    const config = {
      headers: {
        "otree-rest-key": otreeRestKey,
      },
    }
    const payload = {
      session_config_name: sessionConfigName,
      num_participants: numParticipants,
    }
    const results = []
    // Get a map of promises for every REST call to the servers
    // then we can wait on all promises to resolve with Promise.all
    const outerPromises = otreeIPs.map((s) => {
      const apiUrl = `http://${s}/api/sessions`
      // console.log(`Calling ${apiUrl}`)
      return axios
        .post(apiUrl, payload, config)
        .then((res) => {
          // console.log(res.data)
          results.push(res.data)
        })
        .catch((err) => {
          console.error(err)
        }) //axios
    }) //outerPromises
    Promise.all(outerPromises)
      .then(() => {
        // console.log(`${JSON.stringify(results,null,2)}`)
        resolve(results)
      })
      .catch((error) => {
        reject(error)
      })
  }) // Promise
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

function lastElement(arr) {
  return arr[arr.length - 1]
}

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

async function main() {
  // Get current server URLs
  // const results = await getOtreeUrls(otreeIPs, otreeRestKey)
  // console.log(results)
  // test create sessions
  // await createSession(otreeIPs, otreeRestKey, "DropOutTest", 12)
  // end test
}

main()
