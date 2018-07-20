#!/bin/bash

docker-compose run --rm postgres psql -h postgres -U postgres simplex_service
