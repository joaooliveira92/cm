#!/usr/bin/env bash
#
# Create an isolated git worktree for one agent session, ready to run gates.
#
# Why this exists: several Claude sessions routinely run against this repo at the same time. When
# they share one checkout they interleave edits in the same files, and `git add`/`commit` from one
# session sweeps in whatever another had uncommitted -- work has shipped here under the wrong
# commit message, unverified by its author, more than once. A worktree gives each session its own
# working directory and its own branch, so `git status` means what it says.
#
# The cost is close to zero: pnpm's content-addressable store hardlinks into the new worktree, so
# the install below takes ~3 seconds rather than re-downloading anything.
#
# Usage:
#   scripts/session-worktree.sh <name> [base-ref]
#
#   name      short session name; becomes branch `session/<name>` and directory `../audit-<name>`
#   base-ref  what to branch from (default: the current branch)
#
# Example:
#   scripts/session-worktree.sh navbar
#   cd ../audit-navbar
#
# When the work is merged, clean up with:
#   git worktree remove ../audit-<name>
#   git branch -d session/<name>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: scripts/session-worktree.sh <name> [base-ref]" >&2
  exit 64
fi

name="$1"
repo_root="$(git rev-parse --show-toplevel)"
base="${2:-$(git -C "$repo_root" rev-parse --abbrev-ref HEAD)}"

branch="session/${name}"
dir="$(dirname "$repo_root")/audit-${name}"

if [ -e "$dir" ]; then
  echo "error: ${dir} already exists. Pick another name, or remove it with:" >&2
  echo "  git worktree remove ${dir}" >&2
  exit 1
fi

if git -C "$repo_root" show-ref --verify --quiet "refs/heads/${branch}"; then
  echo "error: branch ${branch} already exists (a previous session may still hold it)." >&2
  echo "  git worktree list        # see who has it" >&2
  exit 1
fi

echo "==> creating worktree ${dir} on ${branch} (from ${base})"
git -C "$repo_root" worktree add "$dir" -b "$branch" "$base"

echo "==> installing dependencies (hardlinked from the pnpm store, this is fast)"
( cd "$dir" && pnpm install --prefer-offline )

cat <<EOF

Ready. Work in:

  cd ${dir}

Verify with the five fast gates (seconds) and save the desktop suite (~8.5 min) for the end:

  pnpm typecheck && pnpm lint && pnpm effect-lint && pnpm verify-md-links && pnpm verify-db-schema
  pnpm check:all

When it is green and merged back into ${base}:

  git worktree remove ${dir}
  git branch -d ${branch}
EOF
