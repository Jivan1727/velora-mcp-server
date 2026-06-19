# Velora AI Video Studio MCP Server

The official Model Context Protocol (MCP) server for Velora AI Video Studio. This server allows any MCP-compatible AI assistant (like Claude Desktop) to:
- Browse Velora's subscription plans and credit allocations
- Check prices and credit costs for different AI models
- **Create AI videos** with scripts, voices, music, and subtitles
- **Check video status** and **retrieve completed videos**

## 🚀 Features

- **`get_velora_plans`**: List pricing, features, and compute credits for all plans.
- **`estimate_video_cost`**: Calculate the AI Video Credits required for a specific model and duration.
- **`list_ai_models`**: View all available video/image models and their pricing tiers.
- **`create_video`**: Generate a video using your Velora API key.
- **`check_video_status`**: Poll generation progress.
- **`get_video_result`**: Get the final download URL.

## 🛠️ Usage (Local STDIO)

For testing locally with Claude Desktop or running via `npx`:

```bash
# Build the server locally
npm install
npm run build

# Or run instantly via npx (No installation needed!)
npx -y velora-mcp-server
```

## 🤖 Adding to Claude Desktop

To easily integrate Velora Video Studio into Claude Desktop, add this block to your `claude_desktop_config.json`:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "velora": {
      "command": "npx",
      "args": ["-y", "velora-mcp-server@latest"]
    }
  }
}
```

Restart Claude Desktop, and you'll be able to create videos right from your chat!



## 🌍 Deployment (HTTP / SSE for Smithery Listing)

To list this server permanently on the Smithery directory, it is configured to run as an HTTP/SSE server. You can deploy it for free on Render or Railway.

### Option 1: Deploy on Render (Recommended)

1. Push this repository to GitHub.
2. Sign up at [Render.com](https://render.com).
3. Click **New > Web Service**.
4. Connect your GitHub repository.
5. Render will automatically detect the `render.yaml` and `Dockerfile` config.
6. Make sure the Environment Variable `PORT` is set (e.g., `3000`).
7. Deploy! Your server will be live at `https://your-service-name.onrender.com`.

### Option 2: Deploy on Railway

1. Push this repository to GitHub.
2. Sign up at [Railway.app](https://railway.app).
3. Click **New Project > Deploy from GitHub repo**.
4. Railway will automatically detect the `railway.json` and `Dockerfile` config.
5. It will assign a domain automatically.

## 🔗 Submitting to Smithery

Once your server is deployed via Render or Railway:

1. Go to [Smithery.ai](https://smithery.ai)
2. Submit your MCP server using the URL:
   - Provide the **SSE endpoint**: `https://your-service-name.onrender.com/mcp`
3. Fill out the description and list your tools.
4. Your server will now be permanently listed in the Smithery directory for 10,000+ users!

## 🔑 Authentication

Most read-only tools do not require authentication. 
However, **video generation tools** (`create_video`, `check_video_status`, `get_video_result`) require a Velora API key.

The AI assistant will prompt the user to provide their API key when using these tools. Users can generate their API keys at: [https://velorastudio.in/settings/api-keys](https://velorastudio.in/settings/api-keys)

---
*Built by [Velora AI](https://velorastudio.in)*
