import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function getAIExportHeaders() {
  const token = process.env.ZENDESK_AI_EXPORT_TOKEN;
  const orgId = process.env.ZENDESK_AI_EXPORT_ORG_ID;
  const botId = process.env.ZENDESK_AI_EXPORT_BOT_ID;

  if (!token || !orgId || !botId) {
    throw new Error(
      "Missing required env vars: ZENDESK_AI_EXPORT_TOKEN, ZENDESK_AI_EXPORT_ORG_ID, ZENDESK_AI_EXPORT_BOT_ID"
    );
  }

  return {
    authorization: token,
    organizationid: orgId,
    botid: botId,
    "Content-Type": "application/json",
  };
}

function getAIExportBaseUrl() {
  const region = process.env.ZENDESK_AI_EXPORT_REGION || "us";
  return region === "eu"
    ? "https://api.ultimate.ai/data-export/v3"
    : "https://api.us.ultimate.ai/data-export/v3";
}

async function handleExportResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401)
      throw new Error("Unauthorized: check ZENDESK_AI_EXPORT_TOKEN");
    if (response.status === 400)
      throw new Error(`Bad request: ${body}`);
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function getAIExportSignedUrls(
  date: string,
  ttl?: number
): Promise<any> {
  const headers = getAIExportHeaders();
  const baseUrl = getAIExportBaseUrl();

  const body: Record<string, any> = { date };
  if (ttl !== undefined) body.ttl = ttl;

  const response = await fetch(`${baseUrl}/get-signed-urls`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return handleExportResponse(response);
}

export async function fetchAIExportConversations(signedUrl: string): Promise<any> {
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch export file: ${response.status} ${response.statusText}`
    );
  }
  // Files contain newline-delimited JSON objects — parse each line
  const text = await response.text();
  const lines = text.trim().split("\n").filter(Boolean);
  const conversations = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return line;
    }
  });
  return conversations;
}

export function registerAIExportTools(server: McpServer) {
  const s = server as any;

  s.tool(
    "zendesk_ai_export_get_signed_urls",
    "Get signed download URLs for Zendesk AI Agent bot conversation exports for a specific date. " +
      "Files contain one conversation record per line (NDJSON). URLs expire after 24 hours. " +
      "Data is available back to 2024-01-01. Files are generated once daily at midnight UTC, " +
      "so the most recent available date is yesterday.",
    {
      date: z
        .string()
        .describe(
          "Date to export in YYYY-MM-DD format. Returns conversations that ended on this date."
        ),
      ttl: z
        .number()
        .optional()
        .describe(
          "Custom TTL in minutes for signed URL validity. Defaults to 1440 (24 hours)."
        ),
    },
    async ({ date, ttl }: { date: string; ttl?: number }) => {
      try {
        const result = await getAIExportSignedUrls(date, ttl);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text", text: `Error: ${error.message || "Unknown error"}` },
          ],
          isError: true,
        };
      }
    }
  );

  s.tool(
    "zendesk_ai_export_fetch_conversations",
    "Download and parse conversation data from a signed URL returned by zendesk_ai_export_get_signed_urls. " +
      "Returns an array of conversation records. Each record includes conversation ID, timestamps, " +
      "channel, resolution status, and knowledge metrics.",
    {
      signed_url: z
        .string()
        .describe(
          "A signed URL from zendesk_ai_export_get_signed_urls. Must be used within its TTL window."
        ),
    },
    async ({ signed_url }: { signed_url: string }) => {
      try {
        const conversations = await fetchAIExportConversations(signed_url);
        return {
          content: [
            { type: "text", text: JSON.stringify(conversations, null, 2) },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            { type: "text", text: `Error: ${error.message || "Unknown error"}` },
          ],
          isError: true,
        };
      }
    }
  );
}
