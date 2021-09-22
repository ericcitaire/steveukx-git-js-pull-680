podman build --format docker -f Dockerfile.server -t git-server .
podman build --format docker -f Dockerfile.client -t git-client .

podman pod rm -f test-spawn
podman run -dt --rm --pod new:test-spawn -v $HOME/.ssh/id_rsa.pub:/pubkey -e PUBLIC_KEY_FILE=/pubkey git-server
# Wait for SSH server to start
sleep 10
podman run -it --rm --pod test-spawn -v $HOME/.ssh/id_rsa:/root/.ssh/id_rsa:ro -v $(pwd):$(pwd) -w $(pwd) git-client mocha