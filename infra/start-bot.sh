#!/usr/bin/env bash
set -euo pipefail

cd /opt/maybit

# corepack ships with Node 22 and resolves pnpm per package.json's packageManager field
corepack enable >/dev/null 2>&1 || true

exec corepack pnpm --filter @maybit/bot start
