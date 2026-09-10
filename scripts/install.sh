#!/bin/sh
# Install @nyxsky404/vmup globally using whatever Node package manager is available.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/nyxsky404/vmup/main/scripts/install.sh | sh
#   VMUP_PM=pnpm curl -fsSL https://raw.githubusercontent.com/nyxsky404/vmup/main/scripts/install.sh | sh
set -eu

PKG="@nyxsky404/vmup"

die() {
  echo "vmup install: $*" >&2
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  die "Node.js 18+ is required. Install Node, then re-run."
fi

major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$major" -lt 18 ]; then
  die "Node.js 18+ is required (found $(node -v))."
fi

PM=${VMUP_PM:-}
if [ -z "$PM" ]; then
  if command -v npm >/dev/null 2>&1; then
    PM=npm
  elif command -v pnpm >/dev/null 2>&1; then
    PM=pnpm
  elif command -v yarn >/dev/null 2>&1; then
    PM=yarn
  elif command -v bun >/dev/null 2>&1; then
    PM=bun
  else
    die "Need npm, pnpm, yarn, or bun on PATH."
  fi
fi

echo "Installing $PKG with $PM…"
case "$PM" in
  npm) npm i -g "$PKG" ;;
  pnpm) pnpm add -g "$PKG" ;;
  yarn) yarn global add "$PKG" ;;
  bun) bun install -g "$PKG" ;;
  *) die "Unknown VMUP_PM=$PM (use npm, pnpm, yarn, or bun)" ;;
esac

echo
echo "Installed. Next:"
echo "  vmup init"
echo "  vmup check"
