# Edge Simplex Server

Simplex server to integrate simplex credit card purchasing into the Edge Wallet.
You'll need to create a `.env` file. Please see the `.env.sample` for the
required variables.

## Install & Run

    yarn
    yarn start

## Include the events API

    cd docker
    docker-compose -f ./dev-docker-compose.yml up -d
    ./setup_db.sh

    cd ..
    node src/migrate
    node src/poll
    yarn start

## Running...forever

    sudo forever-service install simplex-sandbox -r edge --script src/index.js --start

## TODO

Initially, I was trying to just use this server as a proxy for requests from the
app to simplex. Simplex advised against this, so we need to store some of the
data in postgres.

- [ ] When a user POSTS to `initiate-sell`, we need to store the request
      including the user-id. We will need this for the `send-crypto` calls
- [ ] Either via webhook (p/REST) or polling, cache the result [`send-crypto`][send-crypto] storing the payment address.
    - For development polling is simpler, but for production webhooks would be
        best.
- [ ] After the data is stored, fire off a [`notify-user`][notify-user] to include a deep link for the user

This will get the user to launch the app and actually sign and send the crypto.
When the user launches the Simplex plugin, it queries the message endpoint to
check if there are any sells that need to be sent.

The plugin code is on the [`add-sell`][add-sell] branch of the simplex plugin.

[send-crypto]: https://developer.simplex.com/api-app.html#send-crypto-synopsis
[notify-user]: https://developer.simplex.com/api-app.html#notify-user
[add-sell]: https://github.com/EdgeApp/edge-plugin-simplex/tree/add-sell
