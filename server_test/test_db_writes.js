//const fs = require('fs')
const db = require('../data/userdb.json')
const redirectedUsers = require('./redirected_users.json')
//
//const dbFile = '../data/userdb.json'

//const db = JSON.parse(fs.readFileSync(dbFile))

//console.log(db)
//console.log(redirectedUsers)

const userIds = db.map(u => {
  return u.userId
})

redirectedUsers.forEach(u => {
  if(!userIds.includes(u)) {
    console.log(`${u} not in DB`)
  } else {
    //console.log(u)
  }
})
