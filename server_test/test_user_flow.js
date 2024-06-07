const VirtualUser = require("./virtual-user-ws")
const fs = require("fs")

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min) + min)
}

const maxUsers = parseInt(process.argv[2]) ? parseInt(process.argv[2]) : 100
const experimentId = "public_goods_game"
const url = "http://localhost:8060"
const virtUsers = {}

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
