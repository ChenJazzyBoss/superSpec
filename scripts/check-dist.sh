#!/usr/bin/env bash
#
# check-dist.sh - Build artifact integrity check for superSpec
#
# Verifies that the dist/ directory contains valid build output
# before publishing to npm.
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

log_ok() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  ERRORS=$((ERRORS + 1))
}

log_info() {
  echo -e "${YELLOW}[INFO]${NC} $1"
}

echo "=========================================="
echo " superSpec Build Artifact Check"
echo "=========================================="
echo ""

# ------------------------------------------
# 1. Check dist/ directory exists
# ------------------------------------------
if [ -d "dist" ]; then
  log_ok "dist/ directory exists"
else
  log_fail "dist/ directory does not exist"
  echo ""
  echo "=========================================="
  echo " Result: $ERRORS error(s) found"
  echo "=========================================="
  exit 1
fi

# ------------------------------------------
# 2. Check dist/ contains .js files
# ------------------------------------------
JS_COUNT=$(find dist -name "*.js" -type f | wc -l)
if [ "$JS_COUNT" -gt 0 ]; then
  log_ok "dist/ contains $JS_COUNT .js file(s)"
else
  log_fail "dist/ does not contain any .js files"
fi

# ------------------------------------------
# 3. Check dist/ contains .d.ts files
# ------------------------------------------
DTS_COUNT=$(find dist -name "*.d.ts" -type f | wc -l)
if [ "$DTS_COUNT" -gt 0 ]; then
  log_ok "dist/ contains $DTS_COUNT .d.ts file(s)"
else
  log_fail "dist/ does not contain any .d.ts files"
fi

# ------------------------------------------
# 4. Check package.json main field points to a valid dist file
# ------------------------------------------
MAIN_FIELD=$(node -e "try { const pkg = require('./package.json'); process.stdout.write(pkg.main || ''); } catch(e) { process.stdout.write(''); }" 2>/dev/null)

if [ -z "$MAIN_FIELD" ]; then
  log_fail "package.json has no 'main' field defined"
else
  if [ -f "$MAIN_FIELD" ]; then
    log_ok "package.json 'main' field ($MAIN_FIELD) points to an existing file"
  else
    log_fail "package.json 'main' field ($MAIN_FIELD) points to a non-existent file"
  fi
fi

# ------------------------------------------
# 5. Import test - verify dist/index.js can be loaded
# ------------------------------------------
if [ -f "dist/index.js" ]; then
  if node -e "import('./dist/index.js').then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); })" 2>/dev/null; then
    log_ok "dist/index.js import test passed"
  else
    log_fail "dist/index.js import test failed"
  fi
else
  log_fail "dist/index.js does not exist, cannot run import test"
fi

# ------------------------------------------
# 6. Record build artifact sizes
# ------------------------------------------
echo ""
echo "------------------------------------------"
echo " Build Artifact Sizes"
echo "------------------------------------------"

if [ -d "dist" ]; then
  TOTAL_SIZE=$(du -sh dist | cut -f1)
  echo "  Total dist/ size: $TOTAL_SIZE"

  # List top-level files with sizes
  echo ""
  echo "  File breakdown:"
  find dist -type f \( -name "*.js" -o -name "*.d.ts" \) | sort | while read -r file; do
    FILE_SIZE=$(du -h "$file" | cut -f1)
    printf "    %-50s %s\n" "$file" "$FILE_SIZE"
  done
fi

echo ""

# ------------------------------------------
# Summary
# ------------------------------------------
echo "=========================================="
if [ "$ERRORS" -eq 0 ]; then
  echo -e " ${GREEN}Result: All checks passed${NC}"
  echo "=========================================="
  exit 0
else
  echo -e " ${RED}Result: $ERRORS error(s) found${NC}"
  echo "=========================================="
  exit 1
fi
