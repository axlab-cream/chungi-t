# Project MCP

Keep project-specific MCP server notes and configuration references here.

Do not store global credentials in this folder. Use each CLI's normal login flow.

Claude Code reads project MCP servers from the project root `.mcp.json`.
The default project `.mcp.json` includes trusted remote MCP servers:

```json
{
  "mcpServers": {
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    },
    "comfy-cloud": {
      "type": "http",
      "url": "https://cloud.comfy.org/mcp"
    }
  }
}
```

Default remote servers:

- `figma`: Figma remote MCP for design/file workflows.
- `comfy-cloud`: Comfy Cloud MCP for image, video, audio, 3D, model,
  template, and workflow generation.

Both servers require authentication through the MCP client when prompted. Do not
store tokens or credentials in this project.

For Codex CLI manual setup, the Figma equivalent command is:

```powershell
codex mcp add figma --url https://mcp.figma.com/mcp
```

For Codex config files, Comfy Cloud is commonly represented as:

```toml
[mcp_servers.comfy-cloud]
type = "url"
url = "https://cloud.comfy.org/mcp"
transport = "streamable-http"
```

For Claude Code manual setup, the equivalent commands are:

```powershell
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add --transport http comfy-cloud https://cloud.comfy.org/mcp
```

Local ComfyUI is intentionally not added by default because it depends on the
installed MCP server package, working directory, Python environment, and running
ComfyUI endpoint. Add it only after choosing a server implementation:

```powershell
claude mcp add comfy-local -- python -m comfyui_mcp_server --comfy-url http://localhost:8188
```

```toml
[mcp_servers.comfy-local]
type = "command"
command = "python"
args = ["-m", "comfyui_mcp_server", "--comfy-url", "http://localhost:8188"]
```

If you add more project-specific MCP servers, keep credentials out of the config.

When a project needs MCP, create `.mcp.json` at the project root with:

```json
{
  "mcpServers": {
    "example": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/absolute/path/to/server.js"],
      "env": {}
    }
  }
}
```

Then approve the project MCP server with Claude's normal `/mcp` flow, or set
`enabledMcpjsonServers` / `enableAllProjectMcpServers` in `.claude/settings.json`
only when the server exists and is trusted.
