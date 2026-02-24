import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Type definitions for Zendesk QA Export API

interface QAWorkspace {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface QAUser {
  id: number;
  name?: string;
  email?: string;
  role?: string;
}

interface QAReview {
  id: number;
  conversation_id?: string;
  reviewer_id?: number;
  reviewee_id?: number;
  scorecard_id?: number;
  score?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

interface QACSATEntry {
  id: number;
  conversation_id?: string;
  score?: number;
  comment?: string;
  created_at?: string;
  [key: string]: any;
}

interface QAQuiz {
  id: number;
  name?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface QADispute {
  id: number;
  review_id?: number;
  status?: string;
  reason?: string;
  created_at?: string;
  [key: string]: any;
}

interface QAScorecard {
  id: number;
  name?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  categories?: any[];
  [key: string]: any;
}

interface ErrorOutput {
  error: true;
  message: string;
  code: string;
  details?: any;
}

// Helper function to create QA Bearer token auth headers
function getQAAuthHeaders(): HeadersInit {
  const token = process.env.ZENDESK_QA_API_TOKEN;
  if (!token) {
    throw new Error("ZENDESK_QA_API_TOKEN environment variable is not set");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// Helper function to get QA base URL
function getQABaseUrl(): string {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  if (!subdomain) {
    throw new Error("ZENDESK_SUBDOMAIN environment variable is not set");
  }
  return `https://${subdomain}.zendesk.com/qa`;
}

// Helper function to handle API responses
async function handleQAResponse<T>(response: Response): Promise<T | ErrorOutput> {
  if (!response.ok) {
    if (response.status === 401) {
      return {
        error: true,
        message: "QA API authentication failed. Check ZENDESK_QA_API_TOKEN.",
        code: "AUTH_FAILED",
      };
    }
    if (response.status === 429) {
      return {
        error: true,
        message: "QA API rate limit exceeded (1,500 requests/min). Please try again later.",
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
      message: `QA API error: ${response.status} ${response.statusText}`,
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
// Account-wide endpoints
// ============================================================================

// List all QA workspaces
export async function listQAWorkspaces(): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/workspaces`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// List all QA users (account-wide)
export async function listQAUsers(): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/users`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get reviews (account-wide)
export async function getQAReviews(args: {
  fromDate: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      fromDate: args.fromDate,
      toDate: args.toDate,
      page: args.page,
      pageSize: args.pageSize,
    });
    const url = `${getQABaseUrl()}/api/export/reviews${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get CSAT data (account-wide)
export async function getQACSAT(args: {
  fromDate: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      fromDate: args.fromDate,
      toDate: args.toDate,
      page: args.page,
      pageSize: args.pageSize,
    });
    const url = `${getQABaseUrl()}/api/export/csat${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Quiz endpoints
// ============================================================================

// List all quizzes
export async function listQAQuizzes(): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/quizzes`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get quiz leaderboard
export async function getQAQuizLeaderboard(): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/quizzes/leaderboard`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get quiz overview with statistics
export async function getQAQuizOverview(args: { quizId: string }): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/quizzes/${args.quizId}/overview`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get quiz responses
export async function getQAQuizResponses(args: { quizId: string }): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/quizzes/${args.quizId}/responses`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Conversation search endpoint
// ============================================================================

// Search conversations by email
export async function searchQAConversations(args: { email: string }): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/conversations/search`;
    const response = await fetch(url, {
      method: "POST",
      headers: getQAAuthHeaders(),
      body: JSON.stringify({ email: args.email }),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// ============================================================================
// Workspace-specific endpoints
// ============================================================================

// Get workspace users
export async function getQAWorkspaceUsers(args: { workspaceId: string }): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/workspace/${args.workspaceId}/users`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get workspace reviews
export async function getQAWorkspaceReviews(args: {
  workspaceId: string;
  fromDate: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      fromDate: args.fromDate,
      toDate: args.toDate,
      page: args.page,
      pageSize: args.pageSize,
    });
    const url = `${getQABaseUrl()}/api/export/workspace/${args.workspaceId}/reviews${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get workspace CSAT
export async function getQAWorkspaceCSAT(args: {
  workspaceId: string;
  fromDate: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      fromDate: args.fromDate,
      toDate: args.toDate,
      page: args.page,
      pageSize: args.pageSize,
    });
    const url = `${getQABaseUrl()}/api/export/workspace/${args.workspaceId}/csat${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get workspace disputes
export async function getQAWorkspaceDisputes(args: {
  workspaceId: string;
  fromDate: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<any | ErrorOutput> {
  try {
    const queryParams = buildQueryParams({
      fromDate: args.fromDate,
      toDate: args.toDate,
      page: args.page,
      pageSize: args.pageSize,
    });
    const url = `${getQABaseUrl()}/api/export/workspace/${args.workspaceId}/disputes${queryParams}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Get workspace scorecards
export async function getQAWorkspaceScorecards(args: { workspaceId: string }): Promise<any | ErrorOutput> {
  try {
    const url = `${getQABaseUrl()}/api/export/workspace/${args.workspaceId}/scorecards`;
    const response = await fetch(url, {
      method: "GET",
      headers: getQAAuthHeaders(),
    });
    return handleQAResponse(response);
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

const listWorkspacesSchema = {};

const listUsersSchema = {};

const getReviewsSchema = {
  fromDate: z.string().describe("Start date in ISO format (required)"),
  toDate: z.string().optional().describe("End date in ISO format"),
  page: z.number().optional().describe("Page number for pagination"),
  pageSize: z.number().optional().describe("Number of items per page"),
};

const getCSATSchema = {
  fromDate: z.string().describe("Start date in ISO format (required)"),
  toDate: z.string().optional().describe("End date in ISO format"),
  page: z.number().optional().describe("Page number for pagination"),
  pageSize: z.number().optional().describe("Number of items per page"),
};

const listQuizzesSchema = {};

const getQuizLeaderboardSchema = {};

const getQuizOverviewSchema = {
  quizId: z.string().describe("The ID of the quiz"),
};

const getQuizResponsesSchema = {
  quizId: z.string().describe("The ID of the quiz"),
};

const searchConversationsSchema = {
  email: z.string().describe("Email address to search for"),
};

const workspaceIdSchema = {
  workspaceId: z.string().describe("The ID of the workspace"),
};

const workspaceReviewsSchema = {
  workspaceId: z.string().describe("The ID of the workspace"),
  fromDate: z.string().describe("Start date in ISO format (required)"),
  toDate: z.string().optional().describe("End date in ISO format"),
  page: z.number().optional().describe("Page number for pagination"),
  pageSize: z.number().optional().describe("Number of items per page"),
};

const workspaceCSATSchema = {
  workspaceId: z.string().describe("The ID of the workspace"),
  fromDate: z.string().describe("Start date in ISO format (required)"),
  toDate: z.string().optional().describe("End date in ISO format"),
  page: z.number().optional().describe("Page number for pagination"),
  pageSize: z.number().optional().describe("Number of items per page"),
};

const workspaceDisputesSchema = {
  workspaceId: z.string().describe("The ID of the workspace"),
  fromDate: z.string().describe("Start date in ISO format (required)"),
  toDate: z.string().optional().describe("End date in ISO format"),
  page: z.number().optional().describe("Page number for pagination"),
  pageSize: z.number().optional().describe("Number of items per page"),
};

const workspaceScorecardsSchema = {
  workspaceId: z.string().describe("The ID of the workspace"),
};

// ============================================================================
// Register tools with MCP server
// ============================================================================

export function registerQATools(server: McpServer) {
  // Cast to any to avoid type instantiation depth issues with MCP SDK + Zod
  const s = server as any;

  // Account-wide endpoints
  s.tool(
    "zendesk_qa_list_workspaces",
    "List all Zendesk QA workspaces. Requires ZENDESK_QA_API_TOKEN.",
    listWorkspacesSchema,
    async () => {
      try {
        const result = await listQAWorkspaces();
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
    "zendesk_qa_list_users",
    "List all Zendesk QA users (account-wide). Requires ZENDESK_QA_API_TOKEN.",
    listUsersSchema,
    async () => {
      try {
        const result = await listQAUsers();
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
    "zendesk_qa_get_reviews",
    "Get QA reviews (account-wide) within a date range. Requires ZENDESK_QA_API_TOKEN.",
    getReviewsSchema,
    async (args: { fromDate: string; toDate?: string; page?: number; pageSize?: number }) => {
      try {
        const result = await getQAReviews(args);
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
    "zendesk_qa_get_csat",
    "Get CSAT data (account-wide) within a date range. Requires ZENDESK_QA_API_TOKEN.",
    getCSATSchema,
    async (args: { fromDate: string; toDate?: string; page?: number; pageSize?: number }) => {
      try {
        const result = await getQACSAT(args);
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

  // Quiz endpoints
  s.tool(
    "zendesk_qa_list_quizzes",
    "List all Zendesk QA quizzes. Requires ZENDESK_QA_API_TOKEN.",
    listQuizzesSchema,
    async () => {
      try {
        const result = await listQAQuizzes();
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
    "zendesk_qa_get_quiz_leaderboard",
    "Get the Zendesk QA quiz leaderboard. Requires ZENDESK_QA_API_TOKEN.",
    getQuizLeaderboardSchema,
    async () => {
      try {
        const result = await getQAQuizLeaderboard();
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
    "zendesk_qa_get_quiz_overview",
    "Get a Zendesk QA quiz overview with statistics. Requires ZENDESK_QA_API_TOKEN.",
    getQuizOverviewSchema,
    async (args: { quizId: string }) => {
      try {
        const result = await getQAQuizOverview(args);
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
    "zendesk_qa_get_quiz_responses",
    "Get responses for a Zendesk QA quiz. Requires ZENDESK_QA_API_TOKEN.",
    getQuizResponsesSchema,
    async (args: { quizId: string }) => {
      try {
        const result = await getQAQuizResponses(args);
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

  // Conversation search
  s.tool(
    "zendesk_qa_search_conversations",
    "Search Zendesk QA conversations by email address. Requires ZENDESK_QA_API_TOKEN.",
    searchConversationsSchema,
    async (args: { email: string }) => {
      try {
        const result = await searchQAConversations(args);
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

  // Workspace-specific endpoints
  s.tool(
    "zendesk_qa_workspace_users",
    "Get users for a specific Zendesk QA workspace. Requires ZENDESK_QA_API_TOKEN.",
    workspaceIdSchema,
    async (args: { workspaceId: string }) => {
      try {
        const result = await getQAWorkspaceUsers(args);
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
    "zendesk_qa_workspace_reviews",
    "Get reviews for a specific Zendesk QA workspace within a date range. Requires ZENDESK_QA_API_TOKEN.",
    workspaceReviewsSchema,
    async (args: { workspaceId: string; fromDate: string; toDate?: string; page?: number; pageSize?: number }) => {
      try {
        const result = await getQAWorkspaceReviews(args);
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
    "zendesk_qa_workspace_csat",
    "Get CSAT data for a specific Zendesk QA workspace within a date range. Requires ZENDESK_QA_API_TOKEN.",
    workspaceCSATSchema,
    async (args: { workspaceId: string; fromDate: string; toDate?: string; page?: number; pageSize?: number }) => {
      try {
        const result = await getQAWorkspaceCSAT(args);
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
    "zendesk_qa_workspace_disputes",
    "Get disputes for a specific Zendesk QA workspace within a date range. Requires ZENDESK_QA_API_TOKEN.",
    workspaceDisputesSchema,
    async (args: { workspaceId: string; fromDate: string; toDate?: string; page?: number; pageSize?: number }) => {
      try {
        const result = await getQAWorkspaceDisputes(args);
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
    "zendesk_qa_workspace_scorecards",
    "Get scorecards for a specific Zendesk QA workspace. Requires ZENDESK_QA_API_TOKEN.",
    workspaceScorecardsSchema,
    async (args: { workspaceId: string }) => {
      try {
        const result = await getQAWorkspaceScorecards(args);
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
