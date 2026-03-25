#!/usr/bin/env bash
set -euo pipefail

REPO_SSH="${1:-git@github.com:Heptalabs/chrono-lab.git}"

if [[ ! -d .git ]]; then
  echo "This script must be run at the git repository root."
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_SSH"
else
  git remote add origin "$REPO_SSH"
fi

git branch -M main
git push -u origin main

echo "Pushed to: $REPO_SSH"
