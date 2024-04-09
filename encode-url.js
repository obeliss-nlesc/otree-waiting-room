const { program } = require("commander")
const CryptoJS = require("crypto-js")
require("dotenv").config()
const secretKey = process.env.SECRET_KEY
const config = require("./config.json")
program
  .option("-n, --num-users <int>", "number of users")
  .option("-h, --host <type>", "host to point to")

program.parse(process.argv)
const options = program.opts()
const experimentIds = config.experiments.map((e) => e.name)
const numUsers = options.numUsers || 3
let users = [212035, 212036, 212037]
if (options.numUsers) {
  users = []
  for (let i = 0; i < numUsers; i++) {
    const id = Math.floor(Math.random() * 90000) + 10000
    users.push(id)
  }
}
const hosts = options.host ? [options.host] : ["localhost:8060"]

if (!secretKey) {
  console.log("[ERROR] no secret key")
  return
}
function getYmdDate() {
  const now = new Date()
  let month = ("0" + (now.getMonth() + 1)).slice(-2)
  let day = ("0" + now.getDate()).slice(-2)
  return `${now.getFullYear()}${month}${day}`
}
const now = getYmdDate()
hosts.forEach((host) => {
  experimentIds.forEach((experimentId) => {
    console.log(`URLS for experiment: ${experimentId}`)
    users.forEach((u) => {
      const dataToSign = `${u}:${now}:${experimentId}`
      const signatureWordArray = CryptoJS.HmacSHA256(dataToSign, secretKey)
      const signatureHex = CryptoJS.enc.Hex.stringify(signatureWordArray)
      console.log(
        `http://${host}/room/${experimentId}?respondent=${u}&check=${signatureHex}`,
      )
    })
    console.log("-------")
    console.log()
  })
})
