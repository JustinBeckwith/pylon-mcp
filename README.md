# pylon-mcp

<img src="https://raw.githubusercontent.com/justinbeckwith/pylon-mcp/main/pylon-mcp.png" alt="pylon-mcp" width="400" />

MCP (Model Context Protocol) server for [Pylon](https://www.usepylon.com/) customer support platform.

## Installation

```bash
corepack enable
pnpm install
pnpm run build
```

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Pylon API token:
   ```
   PYLON_API_TOKEN=your_api_token_here
   ```

You can generate an API token from the [Pylon dashboard](https://app.usepylon.com/settings/api-tokens). Note: Only Admin users can create API tokens.

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "pylon": {
      "command": "node",
      "args": ["--env-file", "/path/to/pylon-mcp/.env", "/path/to/pylon-mcp/dist/index.js"]
    }
  }
}
```

### With Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "pylon": {
      "command": "node",
      "args": ["--env-file", "/path/to/pylon-mcp/.env", "/path/to/pylon-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### Organization
- `pylon_get_organization` - Get information about your Pylon organization

### Accounts
- `pylon_list_accounts` - List all accounts with pagination
- `pylon_get_account` - Get a specific account by ID
- `pylon_create_account` - Create a new account
- `pylon_update_account` - Update an existing account
- `pylon_delete_account` - Delete an account
- `pylon_search_accounts` - Search accounts with filters

### Contacts
- `pylon_list_contacts` - List all contacts with pagination
- `pylon_get_contact` - Get a specific contact by ID
- `pylon_create_contact` - Create a new contact
- `pylon_update_contact` - Update an existing contact
- `pylon_delete_contact` - Delete a contact
- `pylon_search_contacts` - Search contacts with filters

### Issues
- `pylon_list_issues` - List issues within a time range
- `pylon_get_issue` - Get a specific issue by ID
- `pylon_create_issue` - Create a new issue/ticket
- `pylon_update_issue` - Update an existing issue
- `pylon_delete_issue` - Delete an issue
- `pylon_search_issues` - Search issues with filters
- `pylon_snooze_issue` - Snooze an issue until a specific time
- `pylon_get_issue_followers` - Get issue followers
- `pylon_update_issue_followers` - Add/remove issue followers

### Messages
- `pylon_redact_message` - Redact a message from an issue

### Tags
- `pylon_list_tags` - List all tags
- `pylon_get_tag` - Get a specific tag by ID
- `pylon_create_tag` - Create a new tag
- `pylon_update_tag` - Update an existing tag
- `pylon_delete_tag` - Delete a tag

### Teams
- `pylon_list_teams` - List all teams
- `pylon_get_team` - Get a specific team by ID
- `pylon_create_team` - Create a new team
- `pylon_update_team` - Update an existing team

## Requirements

- Node.js 24+
- Pylon API token (Admin access required)

## License

MIT
