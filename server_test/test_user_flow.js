const VirtualUser = require("./virtual-user-ws")
const { program } = require("commander")
const http = require("http")

program
  .option("-p, --port <int>", "waiting-room server listen port.")
  .option("-hn, --host <type>", "waiting-room server host.")
  .option("-s, --start <int>", "start userId range.")
  .option("-n, --num <int>", "number of participants.")
  .option("-e, --experimentId <type>", "experiment name.")

program.parse(process.argv)
const options = program.opts()

const host = options.host || "localhost"
const port = options.port || 8060
const start = parseInt(options.start) || 0
const maxUsers = parseInt(options.num) || 99
const experimentId = options.experimentId || "DropOutTest"
const url = `http://${host}:${port}`
const virtUsers = {}

console.log(`Trying server url: ${url} from id ${start} to ${start + maxUsers} for experiment ${experimentId}.`)

function runTest() {
  for (let i = start; i < (start + maxUsers); i++) {
    const id = i
    vu = new VirtualUser(id, experimentId, url)
    virtUsers[id] = vu
  }

  Object.values(virtUsers).forEach((vu) => {
    vu.connect().then(() => {
      // true: random agree or not agree
      // false: always agree
      vu.attemptQueueFlow(true)
    })
  })
}

const Urloptions = {
  hostname: host,
  port: port,
  path: "/",
  method: "GET",
}

const req = http.request(Urloptions, (res) => {
  if (res.statusCode > 0) {
    console.log("Server is up and running.")
    runTest()
  }

  res.on("data", (chunk) => {})

  res.on("end", () => {})
})

req.on("error", (e) => {
  console.log("Server is down or not reachable.")
  console.log('Start server with command e.g. "npm run dev".')
})

req.end()
