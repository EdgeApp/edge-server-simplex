#!/bin/bash


PORT=${1:-5433}
echo $PORT
export DB_IP=127.0.0.1
export PGUSER=postgres
export PGPASSWORD='p@ssw0rd'
DOCKER_CMD="docker run \
     --net=host -e PGUSER=$PGUSER -e PGPASSWORD=$PGPASSWORD \
     --rm -i -t governmentpaas/psql"

function psql_command {
 $DOCKER_CMD psql -h $DB_IP -p $PORT -c "$1"
}

# NOTE: There has to be a better way to do this with less repetition
psql_command "drop database if exists simplex_service"
psql_command "create database simplex_service"
psql_command "drop role if exists simplex"
psql_command "create role simplex with login password '${PGPASSWORD}'"
psql_command "grant all privileges on database simplex_service to simplex"
