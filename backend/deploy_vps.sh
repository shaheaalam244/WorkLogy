#!/usr/bin/env bash
# ==============================================================
# WorkLogy Backend — Automated VPS Deployment / Update Script
# ==============================================================
set -e

echo "=================================================="
echo "🚀 Deploying WorkLogy Backend on VPS..."
echo "=================================================="

# Navigate to script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Pull latest code from repository
echo "📥 1/5 Pulling latest code from Git (main branch)..."
git pull origin main

# 2. Install production dependencies
echo "📦 2/5 Installing production dependencies..."
npm install --omit=dev

# 3. Ensure logs directory exists
echo "📁 3/5 Ensuring log directory exists..."
mkdir -p logs

# 4. Restart or start PM2 process
echo "🔄 4/5 Starting / Reloading PM2 process..."
if pm2 describe worklogy-backend > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --env production
else
    pm2 start ecosystem.config.cjs --env production
fi

# 5. Save PM2 process list to persist across VPS reboots
echo "💾 5/5 Saving PM2 process list for auto-boot..."
pm2 save

echo "=================================================="
echo "🎉 SUCCESS: WorkLogy Backend is 100% running!"
echo "=================================================="
pm2 status worklogy-backend
