#!/bin/bash
. ../.env

DOCKER_CMD="docker run \
     --net=host -e PGUSER=${DB_USERNAME} -e PGPASSWORD=${DB_PASSWORD} \
     --rm -i -t governmentpaas/psql"

function psql_command {
 $DOCKER_CMD psql -h ${DB_HOST} -p ${DB_PORT} -c "$1"
}

# NOTE: There has to be a better way to do this with less repetition
psql_command "drop database if exists ${DB_NAME}"
psql_command "create database ${DB_NAME}"
psql_command "drop role if exists ${DB_ROLE}"
psql_command "create role ${DB_ROLE} with login password '${DB_PASSWORD}'"
psql_command "grant all privileges on database ${DB_NAME} to ${DB_ROLE}"
