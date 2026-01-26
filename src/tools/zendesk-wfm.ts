import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Type definitions for Zendesk WFM (Workforce Management) API

interface WFMActivity {
  id?: string;
  name?: string;
  timestamp?: string;
  [key: string]: any;
}

interface WFMShift {
  id?: string;
  agent_id?: string;
  start_time?: string;
  end_time?: string;
  published?: boolean;
  [key: string]: any;
}

interface WFMTimeOffRequest {
  id?: string;
  agent_id?: string;
  status?: string;
  reason?: string;
  start_time?: string;
  end_time?: string;
  [key: string]: any;
}

interface ErrorOutput {
  error: true;
  message: string;
  code: string;
  details?: any;
}

// Helper function to create WFM Bearer token auth headers
// Falls back to ZENDESK_TOKEN if ZENDESK_WFM_API_TOKEN is not set
function getWFMAuthHeaders(): HeadersInit {
  const token = process.env.ZENDESK_WFM_API_TOKEN || process.env.ZENDESK_TOKEN;
  if (!token) {
    throw new Error("ZENDESK_WFM_API_TOKEN or ZENDESK_TOKEN environment variable is required");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// Helper function to get WFM base URL
function getWFMBaseUrl(): string {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  if (!subdomain) {
    throw new Error("ZENDESK_SUBDOMAIN environment variable is not set");
  }
  return `https://${subdomain}.zendesk.com/wfm/public/api`;
}

// Helper function to handle API responses
async function handleWFMResponse<T>(response: Response): Promise<T | ErrorOutput> {
  if (!response.ok) {
    if (response.status === 401) {
      return {
        error: true,
        message: "WFM API authentication failed. Check ZENDESK_WFM_API_TOKEN.",
        code: "AUTH_FAILED",
      };
    }
    if (response.status === 429) {
      return {
        error: true,
        message: "WFM API rate limit exceeded. Please try again later.",
        code: "RATE_LIMITED",
      };
    }
    if (response.status === 404) {
      return {
        error: true,
        message: "Resource not found. Check the ID or endpoint.",
        code: "NOT_FOUND",
      };
    }
    return {
      error: true,
      message: `WFM API error: ${response.status} ${response.statusText}`,
      code: "API_ERROR",
      details: await response.text(),
    };
  }
  return response.json();
}

// Build query string from parameters
function buildQueryParams(params: Record<string, any>): string {
  const filtered = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null);
  if (filtered.length === 0) return "";
  return "?" + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

// ============================================================================
// Activities endpoint
// ============================================================================

// Get activities (paginated)
export async function getWFMActivities(args: {
  startTime: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      startTime: args.startTime,
    });
    const url = `${getWFMBaseUrl()}/v1/activities${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getWFMAuthHeaders(),
    });
    return handleWFMResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Reports endpoint
// ============================================================================

// Get report data by template ID
export async function getWFMReportData(args: {
  templateId: string;
  startTime: string;
  endTime: string;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      startTime: args.startTime,
      endTime: args.endTime,
    });
    const url = `${getWFMBaseUrl()}/v1/reports/${args.templateId}/data${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getWFMAuthHeaders(),
    });
    return handleWFMResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Shifts endpoint
// ============================================================================

// Fetch shifts for agents
export async function fetchWFMShifts(args: {
  agentIds: string[];
  startDate: string;
  endDate: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  published?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const url = `${getWFMBaseUrl()}/v1/shifts/fetch`;
    const body: any = {
      agentIds: args.agentIds,
      startDate: args.startDate,
      endDate: args.endDate,
    };
    if (args.orderBy !== undefined) body.orderBy = args.orderBy;
    if (args.orderDirection !== undefined) body.orderDirection = args.orderDirection;
    if (args.published !== undefined) body.published = args.published;
    if (args.page !== undefined) body.page = args.page;
    if (args.pageSize !== undefined) body.pageSize = args.pageSize;

    const response = await fetch(url, {
      method: "POST",
      headers: getWFMAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleWFMResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Time Off endpoints (v1)
// ============================================================================

// Get time off requests (v1)
export async function getWFMTimeOff(args: {
  agentId?: string;
  status?: string;
  reason?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      agentId: args.agentId,
      status: args.status,
      reason: args.reason,
      type: args.type,
      startTime: args.startTime,
      endTime: args.endTime,
      page: args.page,
      pageSize: args.pageSize,
    });
    const url = `${getWFMBaseUrl()}/v1/timeOff${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getWFMAuthHeaders(),
    });
    return handleWFMResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Import time off requests (v1)
export async function importWFMTimeOff(args: {
  requests: Array<{
    agentId: string;
    startTime: string;
    endTime: string;
    reason?: string;
    type?: string;
    status?: string;
  }>;
}): Promise<any | ErrorOutput> {
  try {
    const url = `${getWFMBaseUrl()}/v1/timeOff/import`;
    const response = await fetch(url, {
      method: "POST",
      headers: getWFMAuthHeaders(),
      body: JSON.stringify({ requests: args.requests }),
    });
    return handleWFMResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Time Off endpoints (v2)
// ============================================================================

// Get time off requests (v2)
export async function getWFMTimeOffV2(args: {
  agentId?: string;
  status?: string;
  reason?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      agentId: args.agentId,
      status: args.status,
      reason: args.reason,
      type: args.type,
      startTime: args.startTime,
      endTime: args.endTime,
      page: args.page,
      pageSize: args.pageSize,
    });
    const url = `${getWFMBaseUrl()}/v2/timeOff${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getWFMAuthHeaders(),
    });
    return handleWFMResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Import time off requests (v2)
export async function importWFMTimeOffV2(args: {
  requests: Array<{
    agentId: string;
    startTime: string;
    endTime: string;
    reason?: string;
    type?: string;
    status?: string;
  }>;
}): Promise<any | ErrorOutput> {
  try {
    const url = `${getWFMBaseUrl()}/v2/timeOff/import`;
    const response = await fetch(url, {
      method: "POST",
      headers: getWFMAuthHeaders(),
      body: JSON.stringify({ requests: args.requests }),
    });
    return handleWFMResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Schema definitions
// ============================================================================

const getActivitiesSchema = {
  startTime: z.number().describe("Unix timestamp (seconds) to start retrieving activities from (required)"),
};

const getReportDataSchema = {
  templateId: z.string().describe("The ID of the report template"),
  startTime: z.string().describe("Start time in ISO format (required)"),
  endTime: z.string().describe("End time in ISO format (required)"),
};

const fetchShiftsSchema = {
  agentIds: z.array(z.string()).describe("Array of agent IDs to fetch shifts for"),
  startDate: z.string().describe("Start date in ISO format (required)"),
  endDate: z.string().describe("End date in ISO format (required)"),
  orderBy: z.string().optional().describe("Field to order results by"),
  orderDirection: z.enum(["asc", "desc"]).optional().describe("Order direction"),
  published: z.boolean().optional().describe("Filter by publication status"),
  page: z.number().optional().describe("Page number for pagination"),
  pageSize: z.number().optional().describe("Number of items per page"),
};

const getTimeOffSchema = {
  agentId: z.string().optional().describe("Filter by agent ID"),
  status: z.string().optional().describe("Filter by status (e.g., pending, approved, rejected)"),
  reason: z.string().optional().describe("Filter by reason"),
  type: z.string().optional().describe("Filter by type"),
  startTime: z.string().optional().describe("Filter by start time (ISO format)"),
  endTime: z.string().optional().describe("Filter by end time (ISO format)"),
  page: z.number().optional().describe("Page number for pagination"),
  pageSize: z.number().optional().describe("Number of items per page"),
};

const timeOffRequestSchema = z.object({
  agentId: z.string().describe("The agent ID"),
  startTime: z.string().describe("Start time in ISO format"),
  endTime: z.string().describe("End time in ISO format"),
  reason: z.string().optional().describe("Reason for time off"),
  type: z.string().optional().describe("Type of time off"),
  status: z.string().optional().describe("Status of the request"),
});

const importTimeOffSchema = {
  requests: z.array(timeOffRequestSchema).describe("Array of time off requests to import"),
};

// ============================================================================
// Register tools with MCP server
// ============================================================================

export function registerWFMTools(server: McpServer) {
  // Cast to any to avoid type instantiation depth issues with MCP SDK + Zod
  const s = server as any;

  // Activities endpoint
  s.tool(
    "zendesk_wfm_get_activities",
    "Get WFM activities starting from a Unix timestamp. Returns up to 1000 records per request. Use the startTime of the last activity to paginate. Requires ZENDESK_WFM_API_TOKEN or ZENDESK_TOKEN.",
    getActivitiesSchema,
    async (args: { startTime: number }) => {
      try {
        const result = await getWFMActivities(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Reports endpoint
  s.tool(
    "zendesk_wfm_get_report_data",
    "Get WFM report data for a specified template and time range. Requires ZENDESK_WFM_API_TOKEN.",
    getReportDataSchema,
    async (args: { templateId: string; startTime: string; endTime: string }) => {
      try {
        const result = await getWFMReportData(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Shifts endpoint
  s.tool(
    "zendesk_wfm_fetch_shifts",
    "Fetch WFM shifts for specified agents within a date range. Supports filtering by publication status and pagination. Requires ZENDESK_WFM_API_TOKEN.",
    fetchShiftsSchema,
    async (args: {
      agentIds: string[];
      startDate: string;
      endDate: string;
      orderBy?: string;
      orderDirection?: "asc" | "desc";
      published?: boolean;
      page?: number;
      pageSize?: number;
    }) => {
      try {
        const result = await fetchWFMShifts(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Time Off v1 endpoints
  s.tool(
    "zendesk_wfm_get_time_off",
    "Get WFM time off requests with optional filters (agent, status, reason, type, time range). Requires ZENDESK_WFM_API_TOKEN.",
    getTimeOffSchema,
    async (args: {
      agentId?: string;
      status?: string;
      reason?: string;
      type?: string;
      startTime?: string;
      endTime?: string;
      page?: number;
      pageSize?: number;
    }) => {
      try {
        const result = await getWFMTimeOff(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          }],
          isError: true,
        };
      }
    }
  );

  s.tool(
    "zendesk_wfm_import_time_off",
    "Import or update WFM time off requests for agents. Returns IDs of inserted/updated requests. Requires ZENDESK_WFM_API_TOKEN.",
    importTimeOffSchema,
    async (args: {
      requests: Array<{
        agentId: string;
        startTime: string;
        endTime: string;
        reason?: string;
        type?: string;
        status?: string;
      }>;
    }) => {
      try {
        const result = await importWFMTimeOff(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          }],
          isError: true,
        };
      }
    }
  );

  // Time Off v2 endpoints
  s.tool(
    "zendesk_wfm_get_time_off_v2",
    "Get WFM time off requests (v2 API) with optional filters. Enhanced version with additional response fields. Requires ZENDESK_WFM_API_TOKEN.",
    getTimeOffSchema,
    async (args: {
      agentId?: string;
      status?: string;
      reason?: string;
      type?: string;
      startTime?: string;
      endTime?: string;
      page?: number;
      pageSize?: number;
    }) => {
      try {
        const result = await getWFMTimeOffV2(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          }],
          isError: true,
        };
      }
    }
  );

  s.tool(
    "zendesk_wfm_import_time_off_v2",
    "Import or update WFM time off requests (v2 API). Enhanced version with creator details and shift associations in response. Requires ZENDESK_WFM_API_TOKEN.",
    importTimeOffSchema,
    async (args: {
      requests: Array<{
        agentId: string;
        startTime: string;
        endTime: string;
        reason?: string;
        type?: string;
        status?: string;
      }>;
    }) => {
      try {
        const result = await importWFMTimeOffV2(args);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          }],
          isError: true,
        };
      }
    }
  );
}
