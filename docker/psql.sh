#!/bin/bash
. ../.env

docker-compose run --rm postgres psql -h postgres -U ${DB_USERNAME} ${DB_NAME}
