
# -- Building the Images

build:
	docker build -t obeliss/waiting-room .

up: down build start

start: 
	docker run -p 8080:80 -d --name otree-waiting-room --rm obeliss/waiting-room

restart: down up

shell:
	docker exec -it otree-waiting-room /bin/bash

log:
	docker logs -f otree-waiting-room

down:
	docker ps -q --filter name="otree-waiting-room" | xargs -r docker stop
