# Octocode MCP Server Setup

## Overview

This project now includes Octocode MCP (Model Context Protocol) server for semantic code research and context generation. Octocode enables AI assistants to search, analyze, and understand codebases with enhanced intelligence.

## What is Octocode MCP?

Octocode MCP is an MCP server that provides:
- **Semantic Code Search**: Search across GitHub repositories naturally
- **Real-time Context Generation**: Transform codebases into AI-optimized knowledge
- **Multi-Repository Support**: Access both public and private repos based on permissions
- **Live Documentation**: Find real implementations and current docs

## Installation

### Prerequisites

- Node.js >= 18.12.0 ✅ (v20.19.5 installed)
- Git ✅ (installed)
- GitHub CLI ✅ (v2.81.0 installed)
- GitHub Authentication ✅ (configured)

### Configuration

The Octocode MCP server is configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "octocode": {
      "command": "npx",
      "args": [
        "octocode-mcp@latest"
      ]
    }
  }
}
```

### Authentication

This project uses GitHub CLI for authentication (recommended method):
- **Automatic token management**: No manual configuration needed
- **2FA Support**: Full support for two-factor authentication
- **SSO Compatible**: Works with GitHub Enterprise SSO

Current authentication status:
```
✓ Logged in to github.com
✓ Account: genspark-ai-developer[bot]
✓ Protocol: https
```

## Usage

Once configured, your AI assistant can use Octocode tools to:

1. **Search Code**: Find implementations across repositories
   ```
   Search GitHub for React hooks implementations
   ```

2. **View Repository Structure**: Understand project organization
   ```
   Show me the structure of repository owner/repo-name
   ```

3. **Get File Content**: Read specific files from repositories
   ```
   Get the content of src/index.ts from owner/repo-name
   ```

4. **Search Repositories**: Find relevant projects
   ```
   Find repositories using TypeScript and Express
   ```

5. **Search Pull Requests**: Review code changes
   ```
   Show recent pull requests in owner/repo-name
   ```

## Available MCP Tools

Octocode exposes these tools to AI assistants:
- `githubSearchCode`: Search for code across repositories
- `githubSearchRepositories`: Find repositories by query
- `githubViewRepoStructure`: View directory structure
- `githubGetFileContent`: Read file contents
- `githubSearchPullRequests`: Search for pull requests

## Version Information

- **Octocode MCP**: v8.0.0 (latest)
- **Installed**: November 29, 2025
- **Installation Method**: npx package manager
- **Auto-update**: Using @latest tag ensures automatic updates

## IDE Integration

### Cursor
The configuration is already set up in `.cursor/mcp.json`. Simply:
1. Open Cursor
2. Go to Settings → MCP
3. The Octocode server should appear as configured
4. Restart Cursor to activate

### Other IDEs
Refer to the [Octocode documentation](https://github.com/bgauryy/octocode-mcp) for:
- VS Code / GitHub Copilot
- Claude Desktop
- Claude Code
- Amp, Codex, Goose, LM Studio, and more

## Troubleshooting

### MCP Server Not Appearing
1. Ensure `.cursor/mcp.json` exists in project root
2. Restart your IDE completely
3. Check that Node.js >= 18.12.0 is available

### Authentication Issues
1. Verify GitHub CLI authentication:
   ```bash
   gh auth status
   ```
2. Re-authenticate if needed:
   ```bash
   gh auth login
   ```

### Connection Issues
1. Check internet connectivity
2. Verify GitHub API access:
   ```bash
   gh api user
   ```

## Security Notes

- **GitHub CLI Method**: Tokens are managed securely by GitHub CLI
- **No Token Storage**: No personal access tokens stored in code or config
- **Permission-based**: Access is limited to your GitHub permissions
- **Automatic Rotation**: GitHub CLI handles token refresh automatically

## References

- [Octocode MCP GitHub Repository](https://github.com/bgauryy/octocode-mcp)
- [GitHub CLI Documentation](https://cli.github.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## Next Steps

With Octocode MCP configured, you can now:
1. Ask your AI assistant to search code examples
2. Analyze repository structures
3. Find implementation patterns
4. Review pull requests contextually
5. Research best practices from real codebases

---

**Last Updated**: November 29, 2025  
**Octocode Version**: 8.0.0  
**Status**: ✅ Configured and Ready
