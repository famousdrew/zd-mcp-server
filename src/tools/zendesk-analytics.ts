import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function getZendeskBaseUrl() {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  if (!subdomain) throw new Error("Missing ZENDESK_SUBDOMAIN");
  return `https://${subdomain}.zendesk.com/api/v2`;
}

function getZendeskAuthHeaders() {
  const email = process.env.ZENDESK_EMAIL;
  const token = process.env.ZENDESK_TOKEN;
  if (!email || !token)
    throw new Error("Missing ZENDESK_EMAIL or ZENDESK_TOKEN");
  const credentials = Buffer.from(`${email}/token:${token}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

async function zdFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getZendeskBaseUrl()}${path}`, {
    headers: getZendeskAuthHeaders(),
  });
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) throw new Error("Unauthorized: check ZENDESK_EMAIL and ZENDESK_TOKEN");
    if (response.status === 404) throw new Error(`Not found: ${path}`);
    if (response.status === 429) throw new Error("Rate limited by Zendesk API");
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

// ── Ticket Metrics ─────────────────────────────────────────────────────────

export async function getTicketMetrics(ticketId: number): Promise<any> {
  return zdFetch(`/tickets/${ticketId}/metrics`);
}

export async function listTicketMetrics(
  page?: number,
  perPage?: number
): Promise<any> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("per_page", String(Math.min(perPage, 100)));
  const qs = params.toString();
  return zdFetch(`/ticket_metrics${qs ? `?${qs}` : ""}`);
}

// ── Ticket Audits ──────────────────────────────────────────────────────────

export async function getTicketAudits(ticketId: number): Promise<any> {
  return zdFetch(`/tickets/${ticketId}/audits`);
}

// ── Incremental Ticket Export ──────────────────────────────────────────────

export async function getIncrementalTickets(
  startTime?: number,
  cursor?: string
): Promise<any> {
  const params = new URLSearchParams();
  if (cursor) {
    params.set("cursor", cursor);
  } else if (startTime) {
    params.set("start_time", String(startTime));
  } else {
    // Default: 30 days ago
    params.set("start_time", String(Math.floor(Date.now() / 1000) - 30 * 86400));
  }
  return zdFetch(`/incremental/tickets/cursor?${params.toString()}`);
}

// ── Tool Registration ──────────────────────────────────────────────────────

export function registerAnalyticsTools(server: McpServer) {
  const s = server as any;

  s.tool(
    "zendesk_get_ticket_metrics",
    "Get timing and performance metrics for a specific ticket: first reply time, " +
      "full resolution time, agent wait time, requester wait time, reopens count, " +
      "replies count, and first assignee timestamps.",
    {
      ticket_id: z.string().describe("The ID of the ticket"),
    },
    async ({ ticket_id }: { ticket_id: string }) => {
      try {
        const result = await getTicketMetrics(parseInt(ticket_id, 10));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  s.tool(
    "zendesk_list_ticket_metrics",
    "List ticket metrics across all tickets (newest first, max 100 per page). " +
      "Useful for bulk performance analysis — response times, reopens, reply counts.",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      per_page: z
        .number()
        .optional()
        .describe("Results per page, max 100 (default: 100)"),
    },
    async ({ page, per_page }: { page?: number; per_page?: number }) => {
      try {
        const result = await listTicketMetrics(page, per_page);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  s.tool(
    "zendesk_get_ticket_audits",
    "Get the full field-level change history for a ticket. Each audit entry records " +
      "what changed (status, assignee, tags, custom fields, etc.), who made the change, " +
      "and when. Useful for tracing how a ticket evolved over its lifetime.",
    {
      ticket_id: z.string().describe("The ID of the ticket"),
    },
    async ({ ticket_id }: { ticket_id: string }) => {
      try {
        const result = await getTicketAudits(parseInt(ticket_id, 10));
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );

  s.tool(
    "zendesk_incremental_tickets",
    "Efficiently export tickets updated since a given time using cursor-based pagination. " +
      "Returns up to 1000 tickets per page plus an after_cursor for the next page. " +
      "Use start_time on the first call; pass after_cursor on subsequent calls to paginate. " +
      "Best for bulk data pulls and keeping a local dataset in sync.",
    {
      start_time: z
        .number()
        .optional()
        .describe(
          "Unix timestamp to start from. Defaults to 30 days ago. Must be at least 1 minute in the past."
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          "Pagination cursor from the after_cursor field of a previous response. " +
            "When provided, start_time is ignored."
        ),
    },
    async ({ start_time, cursor }: { start_time?: number; cursor?: string }) => {
      try {
        const result = await getIncrementalTickets(start_time, cursor);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Error: ${error.message || "Unknown error"}` }],
          isError: true,
        };
      }
    }
  );
}
