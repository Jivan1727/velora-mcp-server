# Velora MCP Server

Official [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Velora AI Video Studio](https://velorastudio.in).

Connect any MCP-compatible AI assistant (Claude, Cursor, Windsurf, etc.) to Velora's data — so it can help users choose plans, estimate costs, and discover AI models **without leaving their workflow**.

---

## 🚀 Quick Install (via Smithery)

The easiest way to install is through [Smithery](https://smithery.ai/server/velora-mcp-server):

```bash
npx -y @smithery/cli install velora-mcp-server --client claude
```

---

## 🛠️ Manual Install

### Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "velora": {
      "command": "npx",
      "args": ["-y", "velora-mcp-server"]
    }
  }
}
```

**Config file location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Cursor / Windsurf

Add to your MCP settings:

```json
{
  "velora": {
    "command": "npx",
    "args": ["-y", "velora-mcp-server"]
  }
}
```

---

## 🔧 Available Tools

### `get_velora_plans`
Returns all Velora subscription plans with pricing, credit allocations, features, and storage limits.

**Parameters:**
- `plan_id` *(optional)*: Filter to a specific plan (`free`, `starter`, `creator`, `studio`, `enterprise`)

**Example prompts:**
- *"What's included in the Velora Creator plan?"*
- *"Compare all Velora plans"*
- *"How much does Velora Studio cost?"*

---

### `estimate_video_cost`
Estimates how many AI Video Credits are needed to generate a clip.

**Parameters:**
- `model` *(required)*: The AI model name (e.g. `kling_3_0`, `veo3_1`, `sora_2`, `wan2_5`)
- `duration_seconds` *(required)*: Clip length in seconds (1–15)

**Example prompts:**
- *"How many credits does a 10-second Sora 2 video cost on Velora?"*
- *"What plan do I need to generate Veo 3.1 videos?"*

---

### `list_ai_models`
Lists all AI video and image generation models available on Velora, grouped by quality tier, with credit costs.

**Parameters:**
- `category` *(optional)*: `video`, `image`, or `all` (default: `all`)

**Example prompts:**
- *"What AI video models does Velora support?"*
- *"Show me budget video models on Velora"*
- *"What image generation models are available?"*

---

## 💡 Why This Exists

When you connect this MCP server to your AI assistant:

- Any AI can **accurately answer questions** about Velora pricing, without hallucinating
- Users planning video projects get **instant cost estimates** from inside Claude/Cursor
- Velora gets discovered **organically** by developers and creators using AI tools daily

---

## 📦 Running Locally

```bash
git clone https://github.com/Jivan1727/velora-backend
cd mcp-server
npm install
npm run build
node build/index.js
```

## 🔗 Links

- **Website**: https://velorastudio.in
- **Pricing**: https://velorastudio.in/pricing
- **Contact / Enterprise**: office@velorastudio.in
