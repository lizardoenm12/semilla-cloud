#!/usr/bin/env bash
# Azure Cloud Shell (Bash). No usar el antiguo script gcloud del ZIP original.
set +x
set -euo pipefail
cd "$(dirname "$0")/.."
: "${URL:?Configura URL=https://URL-REAL}"
read -r -s -p 'Token de demo: ' DEMO_TOKEN
printf '\n'
export DEMO_TOKEN
trap 'unset DEMO_TOKEN' EXIT
node scripts/verificar-m2.mjs
