#!/usr/bin/env bash
set -euo pipefail

# install-mcp.sh — Register boilerforge as an MCP server for Claude Code and Cursor

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${BLUE}[boilerforge]${NC} $*"; }
ok()    { echo -e "${GREEN}[boilerforge]${NC} $*"; }
warn()  { echo -e "${YELLOW}[boilerforge]${NC} $*"; }

MCP_ENTRY='{
  "command": "npx",
  "args": ["-y", "@cometforge/boilerforge@latest"],
  "type": "stdio"
}'

# Add boilerforge to an MCP config file using jq or a fallback
add_to_config() {
  local config_file="$1"
  local config_dir
  config_dir="$(dirname "$config_file")"

  # Create directory if needed
  mkdir -p "$config_dir"

  if [ ! -f "$config_file" ]; then
    # Create new config with boilerforge entry
    cat > "$config_file" <<EOF
{
  "mcpServers": {
    "boilerforge": ${MCP_ENTRY}
  }
}
EOF
    ok "Created $config_file with boilerforge"
    return 0
  fi

  # File exists — merge in the boilerforge entry
  if command -v jq &>/dev/null; then
    local tmp
    tmp="$(mktemp)"
    jq --argjson bf "$MCP_ENTRY" '.mcpServers.boilerforge = $bf' "$config_file" > "$tmp" \
      && mv "$tmp" "$config_file"
    ok "Added boilerforge to $config_file"
  else
    # Fallback: check if already present
    if grep -q '"boilerforge"' "$config_file" 2>/dev/null; then
      warn "boilerforge already present in $config_file (skipping — install jq for auto-merge)"
      return 0
    fi
    # Simple sed insertion after "mcpServers": {
    local entry
    entry=$(printf '    "boilerforge": %s,' "$MCP_ENTRY" | tr '\n' ' ')
    if grep -q '"mcpServers"' "$config_file"; then
      # Use a temp file for cross-platform sed compatibility (macOS + Linux)
      local tmp_sed
      tmp_sed="$(mktemp)"
      sed "s/\"mcpServers\": {/\"mcpServers\": {\n${entry}/" "$config_file" > "$tmp_sed" \
        && mv "$tmp_sed" "$config_file"
      ok "Added boilerforge to $config_file (install jq for cleaner merging)"
    else
      warn "Could not find mcpServers in $config_file — please add boilerforge manually"
      echo "  Add this to mcpServers:"
      echo "  \"boilerforge\": $MCP_ENTRY"
      return 1
    fi
  fi
}

info "Installing boilerforge MCP server..."
echo ""

# Claude Code: ~/.claude.json
CLAUDE_CONFIG="$HOME/.claude.json"
info "Configuring Claude Code ($CLAUDE_CONFIG)..."
add_to_config "$CLAUDE_CONFIG"

echo ""

# Cursor: ~/.cursor/mcp.json
CURSOR_CONFIG="$HOME/.cursor/mcp.json"
info "Configuring Cursor ($CURSOR_CONFIG)..."
add_to_config "$CURSOR_CONFIG"

echo ""
ok "Done! boilerforge is now registered as an MCP server."
echo ""
info "Available tools:"
echo "  - list_boilerplates  — List all boilerplates"
echo "  - get_boilerplate    — Get files for a boilerplate"
echo "  - scaffold_project   — Scaffold a boilerplate into a directory"
echo ""
info "Try asking your AI agent: \"List all boilerforge boilerplates\""
