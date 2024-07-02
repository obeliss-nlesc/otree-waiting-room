const { program } = require("commander")
const CryptoJS = require("crypto-js")
const fs = require("fs")
program.option("-p, --password <string>", "password to hash in SHA256")

program.parse(process.argv)
const options = program.opts()

function validatePass(pass, testHash) {
  const hash = CryptoJS.SHA256(pass).toString(CryptoJS.enc.Hex)
  return hash == testHash
}

function createHash(pass) {
  return CryptoJS.SHA256(pass).toString(CryptoJS.enc.Hex)
}

function main() {
  if (!options.password) {
    console.error("--password argument missing!")
    return
  }

  const hash = createHash(options.password)
  if (!validatePass(options.password, hash)) {
    console.error("Something went wrong!")
    return
  }
  writeTofile(hash)
  console.log("Copy the following line to your .env file.")
  console.log(`URL_PASS=${hash}`)
}

function writeTofile(hash, filePath = "pass.key") {
  fs.writeFile(filePath, hash, { flag: "w" }, (err) => {
    if (err) {
      throw err
    }
    console.log(`Pass saved to ${filePath}!`)
  })
}

main()
