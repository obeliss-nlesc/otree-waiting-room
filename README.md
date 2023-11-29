# otree-waiting-room
## Setup docker environment
Run multiple otree servers using docker compose. follow [setup](https://github.com/obeliss-nlesc/otree-docker).
Run Redis server:
```
docker run -d Redis
```

## Install dependencies
To install package dependencies
```
npm install
```

## Setup .env
If using Docker ( [Docker setup](https://github.com/obeliss-nlesc/otree-docker) ) development environment then run 
```
node set_env.js > .env
```
to set the .env file. The script will scan the local docker images to get the IPs of the containers.

## Generate public and private keys
To generate keys for token encoding and verification, first generate the private key
```
openssl genpkey -algorithm RSA -out private-key.pem
```
then generate the public key
```
openssl rsa -pubout -in private-key.pem -out public-key.pem
```

## Start waiting room
To start server on a default port 8060 localhost
```
npm run dev
```
Three test user URLs are printed on the command line that can be used to test the server.

## API documentation
API endpoints are documented using Postman and can be found [here](https://documenter.getpostman.com/view/1612141/2s9YeG7Bqm).
API endpoints have a pre-request script [postman-rest-pre-request-script.js](postman-rest-pre-request-script.js) that is added to all admin endpoints. For the script to run you have to add a Postman environment variable 'apiKey' with the value taken from the .env file generated earlier. 




