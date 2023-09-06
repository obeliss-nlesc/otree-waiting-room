
# -- Building the Images

build:
	docker build -t obeliss/waiting-room .

run: build
	docker ps -q --filter name="otree-waiting-room" | xargs -r docker stop
	docker run -p 8080:80 --name otree-waiting-room --rm obeliss/waiting-room

shell:
	docker exec -it otree-waiting-room /bin/bash

stop:
	docker stop otree-waiting-room
