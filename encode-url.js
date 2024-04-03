const CryptoJS = require("crypto-js")
require("dotenv").config()
const secretKey = process.env.SECRET_KEY
const experimentIds = ["public_goods_game", "DropOutTest"]
const users = [212035, 212036, 212037, 212038, 212039, 212040]
const hosts = ["lobby.lisspanel.nl", "localhost:8060"]
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
  experimentIds.forEach(experimentId => {
    console.log(`URLS for experiment: ${experimentId}`)
    users.forEach((u) => {
      const dataToSign = `${u}:${now}:${experimentId.toLowerCase()}`
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
