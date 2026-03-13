#!/usr/bin/env bash
# deploy-edge-functions.sh
#
# Deploys the three Supabase Edge Functions required for food search and AI verification.
#
# Prerequisites:
#   - Supabase CLI installed: https://supabase.com/docs/guides/cli/getting-started
#   - Project linked: supabase link --project-ref <your-project-ref>
#   - Secrets set (see reminders at end of script)
#
# Usage:
#   bash scripts/deploy-edge-functions.sh

set -euo pipefail

if ! command -v supabase &>/dev/null; then
  echo "Error: supabase CLI not found on PATH."
  echo "Install it from https://supabase.com/docs/guides/cli/getting-started"
  exit 1
fi

echo "Deploying search-usda..."
supabase functions deploy search-usda --no-verify-jwt

echo "Deploying search-off..."
supabase functions deploy search-off --no-verify-jwt

echo "Deploying verify-nutrition..."
supabase functions deploy verify-nutrition --no-verify-jwt

echo ""
echo "Deployment complete."
echo ""
echo "Ensure secrets are set:"
echo "  supabase secrets set USDA_API_KEY=your_key_here"
echo "  supabase secrets set ANTHROPIC_API_KEY=sk-ant-..."
