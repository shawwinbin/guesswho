#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
SERVER_ENV_FILE="$SERVER_DIR/.env"
SERVER_ENV_EXAMPLE="$SERVER_DIR/.env.example"

echo "Bootstrapping local environment in $ROOT_DIR"

if [[ ! -f "$SERVER_ENV_FILE" ]]; then
  cp "$SERVER_ENV_EXAMPLE" "$SERVER_ENV_FILE"
  echo "Created $SERVER_ENV_FILE from template."
else
  echo "Using existing $SERVER_ENV_FILE."
fi

echo "Installing frontend dependencies..."
(cd "$ROOT_DIR" && npm install)

echo "Installing backend dependencies..."
(cd "$SERVER_DIR" && npm install)

echo "Running backend migrations..."
(cd "$SERVER_DIR" && npm run migrate)

cat <<'EOF'

Bootstrap complete.

Next steps:
1. Verify server/.env contains valid LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL values.
2. Start frontend locally with: npm run dev
3. Start backend locally with: npm run server:dev
4. Or start the container stack with: docker compose up --build
EOF
