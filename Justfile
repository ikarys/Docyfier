# Docyfier — task runner. Run `just` to list recipes.
# Node version pinned in .nvmrc; use nvm to select it (`nvm use`).

set dotenv-load := true

port := "3000"

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

# Type-check without emitting
typecheck:
    npm run typecheck

# Lint
lint:
    npm run lint

# Type-check + lint
check: typecheck lint

# Remove build output and caches
clean:
    rm -rf .next
