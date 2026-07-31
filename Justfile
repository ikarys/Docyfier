# Docyfier — task runner. Run `just` to list recipes.
# Node version pinned in .nvmrc; use nvm to select it (`nvm use`).

set dotenv-load := true

port := "3000"
image := "docyfier:latest"

# List available recipes
default:
    @just --list

# Install npm dependencies
setup:
    npm install

# Start the dev server (hot reload) on {{port}}
dev port=port:
    npm run dev -- -p {{port}}

# Build the production bundle
build:
    npm run build

# Serve the production build on {{port}} (run `just build` first)
start port=port:
    npm run start -- -p {{port}}

# Build then serve the production bundle
serve port=port: build (start port)

# `next dev` compiles a route the first time it is asked for, so the first
# document opened after a restart waits on ~3600 modules. A built bundle has
# none of that. The kill and the clean are part of the recipe because a dev
# server and a build writing the same .next is what produces
# "Expected clientReferenceManifest to be defined" — twice in one evening.
#
# Stop every dev server, rebuild from scratch, serve the result on {{port}}
prod port=port:
    -pkill -f "next dev"
    -pkill -f "next-server"
    rm -rf .next
    npm run build
    # `next start` warns and is not what a standalone build is meant to run:
    # next.config declares output "standalone" for the Docker image, and the
    # server it emits carries its own node_modules. Static assets are not
    # copied into it by the build, so they are put beside it here.
    cp -r public .next/standalone/public
    cp -r .next/static .next/standalone/.next/static
    # Every stored thing hangs off DOCYFIER_DATA_DIR, and its default hangs off
    # the working directory — which is .next/standalone for this server, not the
    # repo. Left implicit, the build starts on an empty instance: no providers,
    # no credentials, and a second secret.key that cannot read the first one's
    # ciphertext. It is passed here so dev and prod share one instance.
    DOCYFIER_DATA_DIR={{justfile_directory()}}/data/documents PORT={{port}} node .next/standalone/server.js

# Build the Docker image (tagged {{image}})
docker-build tag=image:
    docker build -t {{tag}} .

# Type-check without emitting
typecheck:
    npm run typecheck

# Lint
lint:
    npm run lint

# Run the test suite once
test:
    npm run test

# Re-run the tests on change
test-watch:
    npm run test:watch

# Run the tests and enforce the coverage thresholds
coverage:
    npm run coverage

# Everything CI runs, minus the build
check: typecheck lint coverage

# Remove build output and caches
clean:
    rm -rf .next
