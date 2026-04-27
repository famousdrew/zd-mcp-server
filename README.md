# Zendesk MCP Server

[![npm version](https://badge.fury.io/js/zd-mcp-server.svg)](https://www.npmjs.com/package/zd-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides AI assistants like Claude with seamless integration to Zendesk Support. Enables natural language interactions with Zendesk tickets, allowing you to search, create, update, and manage support tickets through conversational AI.

## ✨ Features

- 🎫 **Complete Ticket Management**: Create, read, update, and search Zendesk tickets
- 💬 **Comments & Notes**: Add public comments and private internal notes
- 🔍 **Advanced Search**: Search tickets using Zendesk's powerful query syntax
- 🔗 **Incident Management**: Retrieve and manage linked incident tickets
- 🏷️ **Tag Management**: Add and manage ticket tags and metadata
- 🏢 **Brand Support**: List brands and search/analyze tickets by brand
- 📊 **Ticket Analysis**: Analyze tickets for root cause analysis with full comment history
- 📈 **Trend Analysis**: Sample tickets per day over time for pattern detection
- 🎛️ **Field Discovery**: List all ticket fields with IDs, types, and dropdown options
- 📝 **QA Integration**: Access Zendesk QA (formerly Klaus) reviews, CSAT, quizzes, and scorecards
- ⏱️ **Ticket Metrics**: Pull response times, resolution times, and reopen counts per ticket
- 🕵️ **Ticket Audits**: Full field-level change history for any ticket
- 📦 **Incremental Exports**: Cursor-based bulk ticket exports for large dataset pulls
- 🤖 **AI Agent Export**: Download bot conversation exports from Zendesk AI Agents
- 👷 **Workforce Management**: Access WFM activities, reports, shifts, and time-off data
- 🔒 **Secure Authentication**: Uses Zendesk API tokens for secure access
- 🚀 **Easy Installation**: Available via npm, npx, or manual setup

## 🚀 Quick Start

### Option 1: NPM Installation (Recommended)

```bash
npm install -g zd-mcp-server
```

### Option 2: Use with npx (No Installation)

```bash
npx zd-mcp-server
```

### Option 3: Development Setup

```bash
git clone https://github.com/famousdrew/zd-mcp-server.git
cd zd-mcp-server
npm install
npm run build
```

## ⚙️ Configuration

### Environment Variables

Set these environment variables in your system or MCP client configuration:

```bash
export ZENDESK_EMAIL="your-email@company.com"
export ZENDESK_TOKEN="your-zendesk-api-token"
export ZENDESK_SUBDOMAIN="your-company"  # from https://your-company.zendesk.com

# Optional: For Zendesk QA (formerly Klaus) features
export ZENDESK_QA_API_TOKEN="your-qa-api-token"

# Optional: For Workforce Management features
export ZENDESK_WFM_API_TOKEN="your-wfm-api-token"

# Optional: For AI Agent conversation export features
export ZENDESK_AI_EXPORT_TOKEN="your-ai-agents-api-token"
export ZENDESK_AI_EXPORT_ORG_ID="your-organization-id"
export ZENDESK_AI_EXPORT_BOT_ID="your-bot-id"
export ZENDESK_AI_EXPORT_REGION="us"  # "us" (default) or "eu"
```

### Claude Desktop Setup

Add to your Claude Desktop configuration file:

**Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "zendesk": {
      "command": "npx",
      "args": ["-y", "zd-mcp-server"],
      "env": {
        "ZENDESK_EMAIL": "your-email@company.com",
        "ZENDESK_TOKEN": "your-zendesk-api-token",
        "ZENDESK_SUBDOMAIN": "your-company"
      }
    }
  }
}
```

**Alternative (if installed globally):**
```json
{
  "mcpServers": {
    "zendesk": {
      "command": "zd-mcp-server",
      "env": {
        "ZENDESK_EMAIL": "your-email@company.com",
        "ZENDESK_TOKEN": "your-zendesk-api-token",
        "ZENDESK_SUBDOMAIN": "your-company"
      }
    }
  }
}
```

### Claude Code (CLI) Setup

```bash
claude mcp add zendesk \
  --transport stdio \
  --env ZENDESK_EMAIL=your-email@company.com \
  --env ZENDESK_TOKEN=your-zendesk-api-token \
  --env ZENDESK_SUBDOMAIN=your-company \
  -- npx -y zd-mcp-server
```

### Cursor IDE Setup

Add to `~/.cursor/mcp.json` or `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "zendesk": {
      "command": "npx",
      "args": ["-y", "zd-mcp-server"],
      "env": {
        "ZENDESK_EMAIL": "your-email@company.com",
        "ZENDESK_TOKEN": "your-zendesk-api-token",
        "ZENDESK_SUBDOMAIN": "your-company"
      }
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients (Cline, Windsurf, etc.), refer to their documentation for MCP server configuration. The server supports standard MCP protocols.

## 🛠️ Available Tools

### Core Ticket Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `zendesk_get_ticket` | Retrieve a ticket by ID | "Get ticket #12345" |
| `zendesk_get_ticket_details` | Get detailed ticket with comments | "Show me full details for ticket #67890" |
| `zendesk_search` | Search tickets with query syntax | "Find all urgent tickets from last week" |
| `zendesk_create_ticket` | Create a new ticket | "Create a high priority ticket for login issues" |
| `zendesk_update_ticket` | Update ticket properties | "Set ticket #555 to solved status" |
| `zendesk_add_private_note` | Add internal agent notes | "Add a private note about investigation progress" |
| `zendesk_add_public_note` | Add public customer comments | "Reply to customer with solution steps" |
| `zendesk_get_linked_incidents` | Get incident tickets linked to problems | "Show incidents related to this problem ticket" |

### Field & Brand Discovery

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `zendesk_list_ticket_fields` | List all ticket fields with IDs, types, and dropdown options | "What custom fields are available?" |
| `zendesk_search_by_field` | Search tickets by field name (auto-resolves to ID) | "Find tickets where Product Area is billing" |
| `zendesk_list_brands` | List all Zendesk brands in the account | "What brands do we have?" |
| `zendesk_search_by_brand` | Search tickets by brand name | "Find open tickets for the uAttend brand" |

### Analysis Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `zendesk_analyze_tickets` | Analyze up to 500 tickets with full comment history | "Analyze the last 30 days of Citadel tickets for root causes" |
| `zendesk_sample_tickets` | Sample N tickets per day for trend analysis | "Sample 25 tickets per day for 20 days from uAttend" |

### Ticket Metrics & History

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `zendesk_get_ticket_metrics` | Get timing metrics for one ticket (reply time, resolution time, reopens) | "How long did ticket #12345 take to resolve?" |
| `zendesk_list_ticket_metrics` | Bulk metrics across all tickets, newest first (max 100/page) | "Pull metrics for the last 100 tickets" |
| `zendesk_get_ticket_audits` | Full field-level change history for a ticket | "Show me every change made to ticket #67890" |
| `zendesk_incremental_tickets` | Cursor-based bulk export of tickets updated since a given time | "Export all tickets updated in the last 7 days" |

### AI Agent Export Tools (requires `ZENDESK_AI_EXPORT_TOKEN`, `ZENDESK_AI_EXPORT_ORG_ID`, `ZENDESK_AI_EXPORT_BOT_ID`)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `zendesk_ai_export_get_signed_urls` | Get signed download URLs for bot conversation exports for a given date | "Get export URLs for bot conversations on 2024-03-15" |
| `zendesk_ai_export_fetch_conversations` | Download and parse conversation records from a signed URL | "Fetch the conversations from this export URL" |

> Data is available back to 2024-01-01. Files are generated once daily at midnight UTC — the most recent available date is yesterday. Signed URLs expire after 24 hours.

### Zendesk QA Tools (requires `ZENDESK_QA_API_TOKEN`)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `zendesk_qa_list_workspaces` | List all QA workspaces | "What QA workspaces do we have?" |
| `zendesk_qa_list_users` | List all QA users (account-wide) | "Show all QA users" |
| `zendesk_qa_get_reviews` | Get QA reviews (account-wide) | "Get all reviews from January 2024" |
| `zendesk_qa_get_csat` | Get CSAT data (account-wide) | "Get CSAT scores for last month" |
| `zendesk_qa_list_quizzes` | List all quizzes | "What quizzes are available?" |
| `zendesk_qa_get_quiz_leaderboard` | Get quiz leaderboard | "Show quiz leaderboard" |
| `zendesk_qa_get_quiz_overview` | Get quiz statistics | "Get statistics for quiz #123" |
| `zendesk_qa_get_quiz_responses` | Get quiz responses | "Get responses for quiz #123" |
| `zendesk_qa_search_conversations` | Search conversations by email | "Find conversations for john@example.com" |
| `zendesk_qa_workspace_users` | Get workspace users | "Get users in workspace #456" |
| `zendesk_qa_workspace_reviews` | Get workspace reviews | "Get reviews for workspace #456 from last month" |
| `zendesk_qa_workspace_csat` | Get workspace CSAT | "Get CSAT for workspace #456" |
| `zendesk_qa_workspace_disputes` | Get workspace disputes | "Get disputes in workspace #456" |
| `zendesk_qa_workspace_scorecards` | Get workspace scorecards | "Show scorecards for workspace #456" |

### Workforce Management Tools (requires `ZENDESK_WFM_API_TOKEN`)

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `zendesk_wfm_get_activities` | Get WFM activities | "Show WFM activities for this week" |
| `zendesk_wfm_get_report_data` | Get WFM report data | "Pull WFM report for last month" |
| `zendesk_wfm_fetch_shifts` | Fetch agent shifts | "Get shifts for the support team" |
| `zendesk_wfm_get_time_off` | Get time-off records | "Show time-off requests for this quarter" |
| `zendesk_wfm_import_time_off` | Import time-off data | "Import time-off records" |

## 💬 Usage Examples

Once configured, you can use natural language with your AI assistant:

### Ticket Management
```
"Show me all high priority tickets assigned to me"
"Create a new ticket: Customer can't access dashboard, priority urgent"
"Update ticket #12345 status to pending and add a note about waiting for customer response"
```

### Search & Discovery
```
"Find all solved tickets from this week tagged with 'billing'"
"Search for open tickets containing 'password reset'"
"Show me tickets created by john@company.com in the last 30 days"
```

### Customer Communication
```
"Add a public comment to ticket #789: 'We've identified the issue and working on a fix'"
"Add a private note: 'Customer confirmed the workaround is effective'"
```

### Advanced Queries
```
"Find all problem tickets that have linked incidents"
"Show me escalated tickets that haven't been updated in 2 days"
"Get details for ticket #456 including all comments and history"
```

### Brand & Field Analysis
```
"List all our Zendesk brands"
"Find open tickets for the Citadel brand"
"What custom fields do we have for tickets?"
"Search for tickets where Product Area is billing"
```

### Root Cause Analysis
```
"Analyze the last 30 days of uAttend tickets and identify common issues"
"Get 100 Citadel tickets from the past week with full conversation history"
"Sample 25 tickets per day from CloudPunch for the last 20 days - what trends do you see?"
```

### Ticket Metrics & History
```
"How long did ticket #12345 take to get a first reply?"
"Show me every status change on ticket #67890"
"Export all tickets updated since last Monday"
```

### AI Agent Conversations
```
"Get the bot conversation export URLs for March 15th"
"Download and summarize yesterday's bot conversation data"
```

### Zendesk QA Analysis
```
"List all QA workspaces"
"Get QA reviews from January 2024"
"Show CSAT scores for workspace #123 from last month"
"What disputes were filed in workspace #456 this quarter?"
"Get the quiz leaderboard"
```

## 🔑 Authentication Setup

### Standard Zendesk API Token

1. Log in to your Zendesk account
2. Go to **Admin Center** → **Apps and integrations** → **APIs** → **Zendesk API**
3. Click **Add API token**, add a description, click **Create**, and copy the token
4. **Important**: Save this token securely — you won't see it again

### AI Agent Export Token

1. Go to **Zendesk AI Agents** settings
2. Navigate to **Settings** → **API**
3. Generate a new API token and note your **Organization ID** and **Bot ID**

### Find Your Subdomain

Your Zendesk URL format: `https://YOUR-SUBDOMAIN.zendesk.com`
Use `YOUR-SUBDOMAIN` as the `ZENDESK_SUBDOMAIN` value.

### Required Permissions

Ensure your Zendesk user account has:
- **Agent** role (minimum)
- **Ticket access** permissions
- **API access** enabled

## 🔧 Development

### Project Structure
```
zd-mcp-server/
├── src/
│   ├── index.ts              # Server entry point
│   └── tools/
│       ├── index.ts          # Core Zendesk tool implementations
│       ├── ticket-fields.ts  # Field, brand, and analysis tools
│       ├── zendesk-qa.ts     # Zendesk QA Export API tools
│       ├── zendesk-wfm.ts    # Workforce Management tools
│       ├── zendesk-analytics.ts  # Ticket metrics, audits, incremental export
│       └── zendesk-ai-export.ts  # AI Agent conversation export
├── .github/
│   └── workflows/
│       └── publish.yml       # Automated npm publishing on version tags
├── dist/                     # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Building from Source
```bash
git clone https://github.com/famousdrew/zd-mcp-server.git
cd zd-mcp-server
npm install
npm run build
```

### Running Locally
```bash
# Start the server
npm start

# Development mode with auto-rebuild
npm run dev
```

### Testing
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Publishing a New Version

Bump the version in `package.json`, then push a version tag:

```bash
git tag v0.6.0
git push origin v0.6.0
```

GitHub Actions will build and publish to npm automatically.

## 🔍 Troubleshooting

### Common Issues

**❌ "Authentication failed" errors**
- Verify your API token is correct and hasn't expired
- Ensure your email address matches your Zendesk account
- Check that your subdomain is spelled correctly (no `.zendesk.com` suffix)

**❌ "Permission denied" errors**
- Verify your Zendesk user has Agent permissions or higher
- Ensure API access is enabled for your account

**❌ "Server not found" errors**
- Ensure you've installed the package: `npm install -g zd-mcp-server`
- Try using npx instead: `npx zd-mcp-server`
- Check that your MCP client configuration file syntax is correct

**❌ "Environment variables not set" errors**
- Verify all three required variables are set: `ZENDESK_EMAIL`, `ZENDESK_TOKEN`, `ZENDESK_SUBDOMAIN`
- Restart your MCP client after setting environment variables

**❌ AI Export errors**
- Confirm `ZENDESK_AI_EXPORT_TOKEN`, `ZENDESK_AI_EXPORT_ORG_ID`, and `ZENDESK_AI_EXPORT_BOT_ID` are all set
- Export files are only available for dates up to yesterday — today's data hasn't been generated yet
- Signed URLs expire after 24 hours; request fresh ones if you get a 403

### Log Files

- **Claude Desktop**: `~/Library/Logs/Claude/` (macOS) or `%APPDATA%/Claude/logs/` (Windows)
- **Cursor**: Check the output panel for MCP server logs

## 📚 Advanced Usage

### Analysis Tool Parameters

#### `zendesk_analyze_tickets`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `brand_name` | string | required | Brand to analyze (partial match) |
| `days_back` | number | 30 | Days to look back |
| `max_tickets` | number | 100 | Max tickets (up to 500) |
| `status` | string | all | Filter: open, pending, solved, closed |
| `priority` | string | all | Filter: low, normal, high, urgent |

#### `zendesk_sample_tickets`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `brand_name` | string | required | Brand to sample (partial match) |
| `days_back` | number | 20 | Days to look back |
| `tickets_per_day` | number | 25 | Tickets per day (up to 50) |
| `status` | string | all | Filter: open, pending, solved, closed |
| `priority` | string | all | Filter: low, normal, high, urgent |
| `include_comments` | boolean | true | Include full comment history |

#### `zendesk_incremental_tickets`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_time` | number | 30 days ago | Unix timestamp to start from |
| `cursor` | string | — | Pagination cursor from a previous response's `after_cursor` field |

### Search Query Syntax

```bash
# Status-based searches
status:open status:pending status:solved

# Priority searches
priority:urgent priority:high priority:normal priority:low

# Date-based searches
created>2024-01-01 updated<2024-01-31

# Tag searches
tags:billing tags:technical-issue

# Requester searches
requester:customer@company.com

# Complex combinations
status:open priority:high created>2024-01-01 tags:billing
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch and open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **GitHub**: https://github.com/famousdrew/zd-mcp-server
- **npm**: https://www.npmjs.com/package/zd-mcp-server
- **Zendesk API Docs**: https://developer.zendesk.com/api-reference/
- **Model Context Protocol**: https://modelcontextprotocol.io/

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/famousdrew/zd-mcp-server/issues)
- **Zendesk API**: [Zendesk Developer Documentation](https://developer.zendesk.com/)
- **MCP Protocol**: [MCP Documentation](https://modelcontextprotocol.io/docs/)

---

Made with ❤️ for the MCP and Zendesk communities
