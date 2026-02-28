#!/usr/bin/env bash
# Add all changes, commit with message, push to GitHub.
# Usage: ./scripts/push.sh [commit message]
#   Or:  npm run push -- "your message"   (default message: "Update")
set -e
MSG="$*"
[ -z "$MSG" ] && MSG="Update"
git add .
if git diff --staged --quiet 2>/dev/null; then
  echo "Nothing to commit. Working tree clean."
  exit 0
fi
git commit -m "$MSG"
git push
echo "Done. Pushed to GitHub."
