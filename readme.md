# Edge Simplex Server

Simplex server to integrate simplex credit card purchasing into the Edge Wallet.
You'll need to create a `.env` file. Please see the `.env.sample` for the
required variables.

## Install & Run

yarn
yarn start

## Include the events API

cd docker
docker-compose up -d
./setup_db.sh

cd ..
node src/migrate
node src/poll
yarn start

## Running...forever

```
sudo forever-service install simplex-sandbox -r edge --script src/index.js --start
```
