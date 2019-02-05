# Edge Simplex Server

Simplex server to integrate Simplex credit card crypto purchasing and selling into the Edge Wallet.
You'll need to create a `.env` file. Please see the `.env.sample` for the
required variables.

## Install & Run

    yarn
    yarn start

## Include the events API
    . ./.env
    cd docker
    docker-compose up -d
    ./setup_db.sh

    cd ..
    
    node src/migrate
    node src/poll
    yarn start

## Running...forever

    sudo forever-service install simplex-sandbox -r edge --script src/index.js --start

## TODO

The plugin code is on the [`add-sell`][add-sell] branch of the simplex plugin.

[send-crypto]: https://developer.simplex.com/api-app.html#send-crypto-synopsis
[notify-user]: https://developer.simplex.com/api-app.html#notify-user
[add-sell]: https://github.com/EdgeApp/edge-plugin-simplex/tree/add-sell
