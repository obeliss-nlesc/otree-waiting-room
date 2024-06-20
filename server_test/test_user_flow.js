const VirtualUser = require("./virtual-user-ws")
const fs = require("fs")
const http = require("http")

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min) + min)
}

const maxUsers = parseInt(process.argv[2]) ? parseInt(process.argv[2]) : 100
const experimentId = "DropOutTest"
const url = "http://localhost:8060"
const virtUsers = {}

function runTest() {
  for (let i = 0; i < maxUsers; i++) {
    const id = 1000 + i
    //const id = randomBetween(1, 9999999)
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

const options = {
  hostname: "localhost",
  port: 8060,
  path: "/",
  method: "GET",
}

const req = http.request(options, (res) => {
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
