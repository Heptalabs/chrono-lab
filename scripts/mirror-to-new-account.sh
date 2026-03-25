#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <new-repo-ssh-url>"
  echo "Example: $0 git@github.com:NewOwner/chrono-lab.git"
  exit 1
fi

NEW_REPO_SSH="$1"

if [[ ! -d .git ]]; then
  echo "This script must be run at the git repository root."
  exit 1
fi

TEMP_REMOTE="new-origin"

if git remote get-url "$TEMP_REMOTE" >/dev/null 2>&1; then
  git remote remove "$TEMP_REMOTE"
fi

git remote add "$TEMP_REMOTE" "$NEW_REPO_SSH"
git push "$TEMP_REMOTE" --all
git push "$TEMP_REMOTE" --tags

echo "Done. Repository mirrored to: $NEW_REPO_SSH"
echo "If needed: git remote remove $TEMP_REMOTE"
