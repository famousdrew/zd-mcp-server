#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { zenDeskTools, searchTickets, getTicket, getTicketDetails, getLinkedIncidents } from "./tools/index.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFileSync } from "fs";

export { searchTickets, getTicket, getTicketDetails, getLinkedIncidents } from "./tools/index.js";
export { listTicketFields, searchByField, listBrands, searchByBrand, analyzeTickets, sampleTicketsByDay } from "./tools/index.js";

export {
  listQAWorkspaces, listQAUsers, getQAReviews, getQACSAT, listQAQuizzes,
  getQAQuizLeaderboard, getQAQuizOverview, getQAQuizResponses, searchQAConversations,
  getQAWorkspaceUsers, getQAWorkspaceReviews, getQAWorkspaceCSAT,
  getQAWorkspaceDisputes, getQAWorkspaceScorecards,
} from "./tools/index.js";

export {
  getWFMActivities, getWFMReportData, fetchWFMShifts, getWFMTimeOff,
  importWFMTimeOff, getWFMTimeOffV2, importWFMTimeOffV2,
} from "./tools/index.js";

export { getAIExportSignedUrls, fetchAIExportConversations } from "./tools/index.js";

export { getTicketMetrics, listTicketMetrics, getTicketAudits, getIncrementalTickets } from "./tools/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf8")
);
const VERSION = packageJson.version;

async function main() {
  const server = new McpServer(
    { name: "zendesk-mcp", version: VERSION },
    { capabilities: { logging: {} } }
  );

  zenDeskTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Zendesk MCP Server v${VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
