const Docker = require('node-docker-api').Docker
const fs = require('fs')
const crypto = require('crypto')

const docker = new Docker({ socketPath: '/var/run/docker.sock' })

const postgresUser="otree_user"
const postgresPass="password"
const postgresDb="django_db"
const otreeRestKey="password"
const apiKey = getApiKeyFromFile('./api.key') || generateApiKey()

function generateApiKey() {
  return crypto.randomBytes(16).toString('hex');
}

function getApiKeyFromFile(path) {
  if (!fs.existsSync(path)) {
    return
  }
  return fs.readFileSync(path)
}

function findKeyValue(obj, keyToFind) {
  const results = [];

  function search(obj, keyToFind) {
    for (let key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        search(obj[key], keyToFind);
      } else if (key === keyToFind) {
        results.push(obj[key]);
      }
    }
  }

  search(obj, keyToFind);
  return results;
}

const getContainersInfo = async () => {
  try {
    const containers = await docker.container.list();
    const containerInfoPromises = containers.filter(async (container) => {
      const inspectInfo = await container.status()
      return inspectInfo.data.State.Status == "running"
    }).map(container => {
      const ip = findKeyValue(container.data.NetworkSettings, "IPAddress")
      return {
        Image: container.data.Image,
        Names: container.data.Names,
        IPAddress: ip
      }
    })
    return await Promise.all(containerInfoPromises);
  } catch (error) {
    throw new Error('Failed to fetch container information: ' + error.message);
  }
};

function getIps(containers, name) {
    return containers.filter(c => {
      return (c.Image.includes(name))
    }).reduce((a,b) => {
      if(a) {
        return a + "," + b.IPAddress[0]
      } else {
        return a + b.IPAddress[0]
      }
    }, '')
}

getContainersInfo()
  .then(containers => {
    const postgresIps = getIps(containers, "postgres")
    const redisIp = getIps(containers, "redis")
    const otreeIps = getIps(containers, "otree")
    console.log(`POSTGRES_IPS=${postgresIps}`)
    console.log(`REDIS_HOST=${redisIp}`)
    console.log(`OTREE_IPS=${otreeIps}`)
    console.log(`POSTGRES_USER=${postgresUser}`)
    console.log(`POSTGRES_DB=${postgresDb}`)
    console.log(`POSTGRES_PASSWORD=${postgresPass}`)
    console.log(`OTREE_REST_KEY=${otreeRestKey}`)
    console.log(`API_KEY=${apiKey}`)

  })
  .catch((error) => {
    console.error('Error:', error);
  });

