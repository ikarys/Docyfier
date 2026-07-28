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
