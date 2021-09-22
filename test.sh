#!/bin/bash

set -ex

docker build -f Dockerfile.server -t git-server .
docker build -f Dockerfile.client -t git-client .

[ -f id_rsa ] || ssh-keygen -f id_rsa -N ''

docker rm -f git-server || true
docker run --name git-server -dt --rm -v "$PWD/id_rsa.pub:/pubkey:ro" -e PUBLIC_KEY_FILE=/pubkey git-server
# Wait for SSH server to start
sleep 10
docker run -it --rm --link git-server -v "$PWD/id_rsa:/root/.ssh/id_rsa:ro" -v "$PWD:$PWD" -w "$PWD" git-client mocha
docker rm -f git-server