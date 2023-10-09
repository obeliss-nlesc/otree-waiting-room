# otree-waiting-room
## Setup docker environment
Run multiple otree servers using docker compose. follow [setup](https://github.com/obeliss-nlesc/otree-docker).
Run Redis server:
```
docker run -d Redis
```
## Setup .env
If using docker development environment then run 
```
node set_env.js > .env
```
to set the .env file. The script will scan the local docker images to get the IPs of the containers.

