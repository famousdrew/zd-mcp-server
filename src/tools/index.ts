import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { zdFetch, zdMutate } from "./zendesk-client.js";
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

// ── Core ticket functions ──────────────────────────────────────────────────

export async function getTicket(ticketId: number): Promise<any> {
  const data = await zdFetch<any>(`/tickets/${ticketId}`);
  return data.ticket;
}

export async function searchTickets(query: string): Promise<any> {
  return zdFetch<any>(`/search?query=${encodeURIComponent(query)}`);
}

export async function getTicketDetails(ticketId: number): Promise<any> {
  const [ticketData, commentsData] = await Promise.all([
    zdFetch<any>(`/tickets/${ticketId}`),
    zdFetch<any>(`/tickets/${ticketId}/comments`),
  ]);
  return {
    ticket: ticketData.ticket,
    comments: commentsData.comments,
  };
}

export async function getLinkedIncidents(ticketId: number): Promise<any> {
  const data = await zdFetch<any>(`/tickets/${ticketId}/incidents`);
  return data.tickets;
}

async function updateTicket(ticketId: number, ticketData: Record<string, any>): Promise<any> {
  const data = await zdMutate<any>("PUT", `/tickets/${ticketId}`, { ticket: ticketData });
  return data.ticket;
}

async function createTicket(ticketData: Record<string, any>): Promise<any> {
  const data = await zdMutate<any>("POST", `/tickets`, { ticket: ticketData });
  return data.ticket;
}

// ── MCP tool registration ──────────────────────────────────────────────────

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
        const result = await getTicket(parseInt(ticket_id, 10));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
      }
    }
  );

  s.tool(
    "zendesk_update_ticket",
    "Update a Zendesk ticket's properties",
    {
      ticket_id: z.string().describe("The ID of the ticket to update"),
      subject: z.string().optional().describe("The new subject of the ticket"),
      status: z.enum(["new", "open", "pending", "hold", "solved", "closed"]).optional().describe("The new status of the ticket"),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional().describe("The new priority of the ticket"),
      type: z.enum(["problem", "incident", "question", "task"]).optional().describe("The new type of the ticket"),
      assignee_id: z.string().optional().describe("The ID of the agent to assign the ticket to"),
      tags: z.array(z.string()).optional().describe("Tags to set on the ticket (replaces existing tags)"),
    },
    async ({ ticket_id, subject, status, priority, type, assignee_id, tags }: {
      ticket_id: string; subject?: string; status?: string; priority?: string;
      type?: string; assignee_id?: string; tags?: string[];
    }) => {
      try {
        const ticketData: Record<string, any> = {};
        if (subject) ticketData.subject = subject;
        if (status) ticketData.status = status;
        if (priority) ticketData.priority = priority;
        if (type) ticketData.type = type;
        if (assignee_id) ticketData.assignee_id = parseInt(assignee_id, 10);
        if (tags) ticketData.tags = tags;
        const result = await updateTicket(parseInt(ticket_id, 10), ticketData);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
      }
    }
  );

  s.tool(
    "zendesk_create_ticket",
    "Create a new Zendesk ticket",
    {
      subject: z.string().describe("The subject of the ticket"),
      description: z.string().describe("The initial description or comment for the ticket"),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional().describe("The priority of the ticket"),
      status: z.enum(["new", "open", "pending", "hold", "solved", "closed"]).optional().describe("The status of the ticket"),
      type: z.enum(["problem", "incident", "question", "task"]).optional().describe("The type of the ticket"),
      tags: z.array(z.string()).optional().describe("Tags to add to the ticket"),
    },
    async ({ subject, description, priority, status, type, tags }: {
      subject: string; description: string; priority?: string;
      status?: string; type?: string; tags?: string[];
    }) => {
      try {
        const ticketData: Record<string, any> = { subject, comment: { body: description } };
        if (priority) ticketData.priority = priority;
        if (status) ticketData.status = status;
        if (type) ticketData.type = type;
        if (tags) ticketData.tags = tags;
        const result = await createTicket(ticketData);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
      }
    }
  );

  s.tool(
    "zendesk_add_private_note",
    "Add a private internal note to a Zendesk ticket",
    {
      ticket_id: z.string().describe("The ID of the ticket to add a note to"),
      note: z.string().describe("The content of the private note"),
    },
    async ({ ticket_id, note }: { ticket_id: string; note: string }) => {
      try {
        const result = await updateTicket(parseInt(ticket_id, 10), { comment: { body: note, public: false } });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
      }
    }
  );

  s.tool(
    "zendesk_add_public_note",
    "Add a public comment to a Zendesk ticket",
    {
      ticket_id: z.string().describe("The ID of the ticket to add a comment to"),
      comment: z.string().describe("The content of the public comment"),
    },
    async ({ ticket_id, comment }: { ticket_id: string; comment: string }) => {
      try {
        const result = await updateTicket(parseInt(ticket_id, 10), { comment: { body: comment, public: true } });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
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
        const result = await searchTickets(query);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
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
        const result = await getTicketDetails(parseInt(ticket_id, 10));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
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
        const result = await getLinkedIncidents(parseInt(ticket_id, 10));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }], isError: true };
      }
    }
  );

  registerTicketFieldTools(server);
  registerQATools(server);
  registerWFMTools(server);
  registerAIExportTools(server);
  registerAnalyticsTools(server);
}

// ── Re-exports ─────────────────────────────────────────────────────────────

export { listTicketFields, searchByField, listBrands, searchByBrand, analyzeTickets, sampleTicketsByDay };

export {
  listQAWorkspaces, listQAUsers, getQAReviews, getQACSAT, listQAQuizzes,
  getQAQuizLeaderboard, getQAQuizOverview, getQAQuizResponses, searchQAConversations,
  getQAWorkspaceUsers, getQAWorkspaceReviews, getQAWorkspaceCSAT,
  getQAWorkspaceDisputes, getQAWorkspaceScorecards,
};

export {
  getWFMActivities, getWFMReportData, fetchWFMShifts, getWFMTimeOff,
  importWFMTimeOff, getWFMTimeOffV2, importWFMTimeOffV2,
};

export { getAIExportSignedUrls, fetchAIExportConversations };

export { getTicketMetrics, listTicketMetrics, getTicketAudits, getIncrementalTickets };
