const pgp = require('pg-promise')()


// Read .env file for env variables
require('dotenv').config();
const postgresIPs = process.env.POSTGRES_IPS.split(',')
const postgreDB = process.env.POSTGRES_DB
const postgresUser = process.env.POSTGRES_USER
const postgresPassword = process.env.POSTGRES_PASSWORD


const clients = postgresIPs.map(ip => {
  const connString = `postgres://${postgresUser}:${postgresPassword}@${ip}/${postgreDB}`
  return pgp(connString)
})

function parQuery(sql) {
  const promises = clients.map(client => {
    return client.query(sql)
  })
  return Promise.all(promises)
}

module.exports = {
  parQuery
}
