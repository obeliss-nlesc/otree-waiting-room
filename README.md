# otree-waiting-room

## Setup docker environment

Run multiple otree servers using docker compose. follow [setup](https://github.com/obeliss-nlesc/otree-docker).

## Download sources
Pull master from github
```shell
git clone https://github.com/obeliss-nlesc/otree-waiting-room.git
```

## Install dependencies

The server runs on node version 20 or greater. Check your node version:
```shell
node -v
```

To install package dependencies
```shell
npm install
```

## Setup .env

If using Docker ([Docker setup](https://github.com/obeliss-nlesc/otree-docker)) development environment, then run

```shell
node set_env.js > .env
```

to set the .env file. The script will scan the local docker images to get the IPs of the containers.

In other cases the .env file needs to be setup manually as an example like so:

```shell
POSTGRES_IPS=192.168.0.1,192.168.0.2,192.168.0.3
OTREE_IPS=192.168.0.1,192.168.0.2,192.168.0.3
POSTGRES_USER=otree_user
POSTGRES_DB=django_db
POSTGRES_PASSWORD=somepassword
OTREE_REST_KEY=somepassword
SECRET_KEY="some secret in quotes"
API_KEY="some other secret in quotes"
```

## Start waiting room

To start server on a default port 8060 localhost

```shell
npm run dev
```

Three test user URLs are printed on the command line that can be used to test the server.

## Starting the server using PM2

To manage the server with pm2, first install pm2

```shell
npm install pm2 -g
pm2 start server.js -- 8080
pm2 list
```


## API documentation

API endpoints are documented using Postman and can be found [here](https://documenter.getpostman.com/view/1612141/2s9YeG7Bqm).
API endpoints have a pre-request script [postman-rest-pre-request-script.js](postman-rest-pre-request-script.js) that is added to all admin endpoints. For the script to run you have to add a Postman environment variable 'apiKey' with the value taken from the .env file generated earlier.
