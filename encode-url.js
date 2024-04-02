const CryptoJS = require("crypto-js")
require("dotenv").config()
const secretKey = process.env.SECRET_KEY
const experimentId = "public_goods_game"
const users = [212035, 212036, 212037, 212038, 212039, 212040]
if (!secretKey) {
  console.log("[ERROR] no secret key")
  return
}
function getYmdDate() {
  const now = new Date()
  let month = ("0" + (now.getMonth() + 1)).slice(-2);
  let day = ("0" + now.getDate()).slice(-2);
  return `${now.getFullYear()}${month}${day}`
}
const now = getYmdDate()
users.forEach((u) => {
  const dataToSign = `${u}${now}`
  const signatureWordArray = CryptoJS.HmacSHA256(dataToSign, secretKey)
  const signatureHex = CryptoJS.enc.Hex.stringify(signatureWordArray)
  console.log(`http://localhost:8060/room/${experimentId}?respondent=${u}&check=${signatureHex}`)
})
