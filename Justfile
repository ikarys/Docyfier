# Docyfier — task runner. Run `just` to list recipes.
# Node is pinned in mise.toml; every recipe runs through `mise exec` so the
# right version is used without activating a shell.

set dotenv-load := true

run := "mise exec --"
port := "3000"

# List available recipes
default:
    @just --list

# Install the pinned Node toolchain and npm dependencies
setup:
    mise install
    {{run}} npm install

# Start the dev server (hot reload) on {{port}}
dev port=port:
    {{run}} npm run dev -- -p {{port}}

# Build the production bundle
build:
    {{run}} npm run build

# Serve the production build on {{port}} (run `just build` first)
start port=port:
    {{run}} npm run start -- -p {{port}}

# Build then serve the production bundle
serve port=port: build (start port)

# Type-check without emitting
typecheck:
    {{run}} npm run typecheck

# Lint
lint:
    {{run}} npm run lint

# Type-check + lint
check: typecheck lint

# Remove build output and caches
clean:
    rm -rf .next
