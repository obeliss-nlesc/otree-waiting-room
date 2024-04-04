
# -- Building the Images

build:
	docker build -t obeliss/waiting-room .

run: build stop start

start: 
	docker run -p 8080:80 -v "${PWD}/data:/usr/data" -d --name otree-waiting-room --rm obeliss/waiting-room

restart: stop start

shell:
	docker exec -it otree-waiting-room /bin/bash

stop:
	docker ps -q --filter name="otree-waiting-room" | xargs -r docker stop
