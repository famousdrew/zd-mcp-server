import type * as ZendeskTypes from "node-zendesk";
import zendesk from "node-zendesk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerTicketFieldTools, listTicketFields, searchByField, listBrands, searchByBrand, analyzeTickets, sampleTicketsByDay } from "./ticket-fields.js";
import {
  registerQATools,
  listQAWorkspaces,
  listQAUsers,
  getQAReviews,
  getQACSAT,
  listQAQuizzes,
  getQAQuizLeaderboard,
  getQAQuizOverview,
  getQAQuizResponses,
  searchQAConversations,
  getQAWorkspaceUsers,
  getQAWorkspaceReviews,
  getQAWorkspaceCSAT,
  getQAWorkspaceDisputes,
  getQAWorkspaceScorecards,
} from "./zendesk-qa.js";
import {
  registerWFMTools,
  getWFMActivities,
  getWFMReportData,
  fetchWFMShifts,
  getWFMTimeOff,
  importWFMTimeOff,
  getWFMTimeOffV2,
  importWFMTimeOffV2,
} from "./zendesk-wfm.js";
import {
  registerAIExportTools,
  getAIExportSignedUrls,
  fetchAIExportConversations,
} from "./zendesk-ai-export.js";
import {
  registerAnalyticsTools,
  getTicketMetrics,
  listTicketMetrics,
  getTicketAudits,
  getIncrementalTickets,
} from "./zendesk-analytics.js";

// Types for exported functions
export interface ZendeskConfig {
  email: string;
  token: string;
  subdomain: string;
}

// Create Zendesk client
export function createZendeskClient(config: ZendeskConfig) {
  return zendesk.createClient({
    username: config.email,
    token: config.token,
    remoteUri: `https://${config.subdomain}.zendesk.com/api/v2`,
  });
}

// Exported read-only tool functions
export async function getTicket(client: any, ticketId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    client.tickets.show(ticketId, (error: Error | undefined, req: any, result: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

export async function searchTickets(client: any, query: string): Promise<any> {
  return new Promise((resolve, reject) => {
    client.search.query(query, (error: Error | undefined, req: any, result: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

export async function getTicketDetails(client: any, ticketId: number): Promise<any> {
  const ticketResult = await getTicket(client, ticketId);
  
  const commentsResult = await new Promise((resolve, reject) => {
    client.tickets.getComments(ticketId, (error: Error | undefined, req: any, result: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

  return {
    ticket: ticketResult,
    comments: commentsResult
  };
}

export async function getLinkedIncidents(client: any, ticketId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    client.tickets.listIncidents(ticketId, (error: Error | undefined, req: any, result: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

// Environment-based client for backward compatibility

if (!process.env.ZENDESK_EMAIL || !process.env.ZENDESK_TOKEN || !process.env.ZENDESK_SUBDOMAIN) {
  throw new Error('Missing required environment variables: ZENDESK_EMAIL, ZENDESK_TOKEN, ZENDESK_SUBDOMAIN');
}

const client = zendesk.createClient({
  username: process.env.ZENDESK_EMAIL as string,
  token: process.env.ZENDESK_TOKEN as string,
  remoteUri: `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2`,
});

export function zenDeskTools(server: McpServer) {
  // Cast to any to avoid type instantiation depth issues with MCP SDK + Zod
  const s = server as any;

  s.tool(
    "zendesk_get_ticket",
    "Get a Zendesk ticket by ID",
    {
      ticket_id: z.string().describe("The ID of the ticket to retrieve"),
    },
    async ({ ticket_id }: { ticket_id: string }) => {
      try {
        const result = await getTicket(client, parseInt(ticket_id, 10));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  s.tool(
    "zendesk_update_ticket",
    "Update a Zendesk ticket's properties",
    {
      ticket_id: z.string().describe("The ID of the ticket to update"),
      subject: z.string().optional().describe("The new subject of the ticket"),
      status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).optional().describe("The new status of the ticket"),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().describe("The new priority of the ticket"),
      type: z.enum(['problem', 'incident', 'question', 'task']).optional().describe("The new type of the ticket"),
      assignee_id: z.string().optional().describe("The ID of the agent to assign the ticket to"),
      tags: z.array(z.string()).optional().describe("Tags to set on the ticket (replaces existing tags)")
    },
    async ({ ticket_id, subject, status, priority, type, assignee_id, tags }: {
      ticket_id: string;
      subject?: string;
      status?: string;
      priority?: string;
      type?: string;
      assignee_id?: string;
      tags?: string[];
    }) => {
      try {
        const ticketData: any = {
          ticket: {}
        };

        // Only add properties that are provided
        if (subject) ticketData.ticket.subject = subject;
        if (status) ticketData.ticket.status = status;
        if (priority) ticketData.ticket.priority = priority;
        if (type) ticketData.ticket.type = type;
        if (assignee_id) ticketData.ticket.assignee_id = parseInt(assignee_id, 10);
        if (tags) ticketData.ticket.tags = tags;

        const result = await new Promise((resolve, reject) => {
          (client as any).tickets.update(parseInt(ticket_id, 10), ticketData, (error: Error | undefined, req: any, result: any) => {
            if (error) {
              console.log(error);
              reject(error);
            } else {
              resolve(result);
            }
          });
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  s.tool(
    "zendesk_create_ticket",
    "Create a new Zendesk ticket",
    {
      subject: z.string().describe("The subject of the ticket"),
      description: z.string().describe("The initial description or comment for the ticket"),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().describe("The priority of the ticket"),
      status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).optional().describe("The status of the ticket"),
      type: z.enum(['problem', 'incident', 'question', 'task']).optional().describe("The type of the ticket"),
      tags: z.array(z.string()).optional().describe("Tags to add to the ticket")
    },
    async ({ subject, description, priority, status, type, tags }: {
      subject: string;
      description: string;
      priority?: string;
      status?: string;
      type?: string;
      tags?: string[];
    }) => {
      try {
        const ticketData: any = {
          ticket: {
            subject,
            comment: { body: description },
          }
        };

        if (priority) ticketData.ticket.priority = priority;
        if (status) ticketData.ticket.status = status;
        if (type) ticketData.ticket.type = type;
        if (tags) ticketData.ticket.tags = tags;

        const result = await new Promise((resolve, reject) => {
          (client as any).tickets.create(ticketData, (error: Error | undefined, req: any, result: any) => {
            if (error) {
              console.log(error);
              reject(error);
            } else {
              resolve(result);
            }
          });
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  s.tool(
    "zendesk_add_private_note",
    "Add a private internal note to a Zendesk ticket",
    {
      ticket_id: z.string().describe("The ID of the ticket to add a note to"),
      note: z.string().describe("The content of the private note")
    },
    async ({ ticket_id, note }: { ticket_id: string; note: string }) => {
      try {
        const result = await new Promise((resolve, reject) => {
          (client as any).tickets.update(parseInt(ticket_id, 10), {
            ticket: {
              comment: {
                body: note,
                public: false
              }
            }
          }, (error: Error | undefined, req: any, result: any) => {
            if (error) {
              console.log(error);
              reject(error);
            } else {
              resolve(result);
            }
          });
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  s.tool(
    "zendesk_add_public_note",
    "Add a public comment to a Zendesk ticket",
    {
      ticket_id: z.string().describe("The ID of the ticket to add a comment to"),
      comment: z.string().describe("The content of the public comment")
    },
    async ({ ticket_id, comment }: { ticket_id: string; comment: string }) => {
      try {
        const result = await new Promise((resolve, reject) => {
          (client as any).tickets.update(parseInt(ticket_id, 10), {
            ticket: {
              comment: {
                body: comment,
                public: true
              }
            }
          }, (error: Error | undefined, req: any, result: any) => {
            if (error) {
              console.log(error);
              reject(error);
            } else {
              resolve(result);
            }
          });
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  s.tool(
    "zendesk_search",
    "Search for Zendesk tickets based on a query",
    {
      query: z.string().describe("Search query (e.g., 'status:open', 'priority:urgent', 'tags:need_help')"),
    },
    async ({ query }: { query: string }) => {
      try {
        const result = await searchTickets(client, query);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  s.tool(
    "zendesk_get_ticket_details",
    "Get detailed information about a Zendesk ticket including comments",
    {
      ticket_id: z.string().describe("The ID of the ticket to retrieve details for"),
    },
    async ({ ticket_id }: { ticket_id: string }) => {
      try {
        const result = await getTicketDetails(client, parseInt(ticket_id, 10));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  s.tool(
    "zendesk_get_linked_incidents",
    "Fetch all incident tickets linked to a particular ticket",
    {
      ticket_id: z.string().describe("The ID of the ticket to retrieve linked incidents for"),
    },
    async ({ ticket_id }: { ticket_id: string }) => {
      try {
        const result = await getLinkedIncidents(client, parseInt(ticket_id, 10));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }],
          isError: true
        };
      }
    }
  );

  // Register ticket field tools
  registerTicketFieldTools(server);

  // Register QA tools (requires ZENDESK_QA_API_TOKEN)
  registerQATools(server);

  // Register WFM tools (requires ZENDESK_WFM_API_TOKEN)
  registerWFMTools(server);

  // Register AI Export tools (requires ZENDESK_AI_EXPORT_TOKEN, ZENDESK_AI_EXPORT_ORG_ID, ZENDESK_AI_EXPORT_BOT_ID)
  registerAIExportTools(server);

  // Register Analytics tools (ticket metrics, audits, incremental export)
  registerAnalyticsTools(server);
}

// Re-export ticket field and brand functions
export { listTicketFields, searchByField, listBrands, searchByBrand, analyzeTickets, sampleTicketsByDay };

// Re-export QA functions
export {
  listQAWorkspaces,
  listQAUsers,
  getQAReviews,
  getQACSAT,
  listQAQuizzes,
  getQAQuizLeaderboard,
  getQAQuizOverview,
  getQAQuizResponses,
  searchQAConversations,
  getQAWorkspaceUsers,
  getQAWorkspaceReviews,
  getQAWorkspaceCSAT,
  getQAWorkspaceDisputes,
  getQAWorkspaceScorecards,
};

// Re-export WFM functions
export {
  getWFMActivities,
  getWFMReportData,
  fetchWFMShifts,
  getWFMTimeOff,
  importWFMTimeOff,
  getWFMTimeOffV2,
  importWFMTimeOffV2,
};

// Re-export AI Export functions
export { getAIExportSignedUrls, fetchAIExportConversations };

// Re-export Analytics functions
export { getTicketMetrics, listTicketMetrics, getTicketAudits, getIncrementalTickets };