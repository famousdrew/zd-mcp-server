import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAIExportSignedUrls, fetchAIExportConversations } from "../zendesk-ai-export.js";

const ENV = {
  ZENDESK_AI_EXPORT_TOKEN: "export-token-abc",
  ZENDESK_AI_EXPORT_ORG_ID: "org-123",
  ZENDESK_AI_EXPORT_BOT_ID: "bot-456",
};

function makeResponse(status: number, body: unknown, isText = false) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(isText ? body : JSON.stringify(body)),
  } as Response;
}

describe("zendesk-ai-export", () => {
  beforeEach(() => {
    vi.stubEnv("ZENDESK_AI_EXPORT_TOKEN", ENV.ZENDESK_AI_EXPORT_TOKEN);
    vi.stubEnv("ZENDESK_AI_EXPORT_ORG_ID", ENV.ZENDESK_AI_EXPORT_ORG_ID);
    vi.stubEnv("ZENDESK_AI_EXPORT_BOT_ID", ENV.ZENDESK_AI_EXPORT_BOT_ID);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("getAIExportSignedUrls", () => {
    it("posts to US endpoint by default", async () => {
      const mockResponse = { date: "2024-03-15", signed_urls: ["https://example.com/file1.json"] };
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, mockResponse));

      await getAIExportSignedUrls("2024-03-15");

      const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.us.ultimate.ai/data-export/v3/get-signed-urls");
      expect(options.method).toBe("POST");
    });

    it("posts to EU endpoint when region is eu", async () => {
      vi.stubEnv("ZENDESK_AI_EXPORT_REGION", "eu");
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { signed_urls: [] }));

      await getAIExportSignedUrls("2024-03-15");

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.ultimate.ai/data-export/v3/get-signed-urls");
    });

    it("sends correct auth headers", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { signed_urls: [] }));
      await getAIExportSignedUrls("2024-03-15");

      const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers.authorization).toBe("export-token-abc");
      expect(headers.organizationid).toBe("org-123");
      expect(headers.botid).toBe("bot-456");
    });

    it("sends date in request body", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { signed_urls: [] }));
      await getAIExportSignedUrls("2024-03-15");

      const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.date).toBe("2024-03-15");
      expect(body.ttl).toBeUndefined();
    });

    it("includes ttl in body when provided", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { signed_urls: [] }));
      await getAIExportSignedUrls("2024-03-15", 60);

      const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.ttl).toBe(60);
    });

    it("throws on 401 with helpful message", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(401, {}));
      await expect(getAIExportSignedUrls("2024-03-15")).rejects.toThrow("ZENDESK_AI_EXPORT_TOKEN");
    });

    it("throws on 400 with body message", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(400, "invalid date format"));
      await expect(getAIExportSignedUrls("not-a-date")).rejects.toThrow("Bad request");
    });
  });

  describe("fetchAIExportConversations", () => {
    it("parses newline-delimited JSON into array", async () => {
      const ndjson = [
        JSON.stringify({ id: "conv-1", status: "resolved" }),
        JSON.stringify({ id: "conv-2", status: "escalated" }),
      ].join("\n");

      vi.mocked(fetch).mockResolvedValue(makeResponse(200, ndjson, true));

      const result = await fetchAIExportConversations("https://example.com/export.json");
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("conv-1");
      expect(result[1].id).toBe("conv-2");
    });

    it("handles single conversation", async () => {
      const ndjson = JSON.stringify({ id: "conv-1" });
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, ndjson, true));

      const result = await fetchAIExportConversations("https://example.com/export.json");
      expect(result).toHaveLength(1);
    });

    it("handles trailing newline gracefully", async () => {
      const ndjson = JSON.stringify({ id: "conv-1" }) + "\n";
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, ndjson, true));

      const result = await fetchAIExportConversations("https://example.com/export.json");
      expect(result).toHaveLength(1);
    });

    it("throws on failed fetch", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(403, "Forbidden", true));
      await expect(fetchAIExportConversations("https://example.com/expired.json"))
        .rejects.toThrow("Failed to fetch export file");
    });
  });

  describe("missing env vars", () => {
    it("throws when ZENDESK_AI_EXPORT_TOKEN is missing", async () => {
      vi.stubEnv("ZENDESK_AI_EXPORT_TOKEN", "");
      await expect(getAIExportSignedUrls("2024-03-15")).rejects.toThrow("ZENDESK_AI_EXPORT_TOKEN");
    });

    it("throws when ZENDESK_AI_EXPORT_ORG_ID is missing", async () => {
      vi.stubEnv("ZENDESK_AI_EXPORT_ORG_ID", "");
      await expect(getAIExportSignedUrls("2024-03-15")).rejects.toThrow("ZENDESK_AI_EXPORT_ORG_ID");
    });

    it("throws when ZENDESK_AI_EXPORT_BOT_ID is missing", async () => {
      vi.stubEnv("ZENDESK_AI_EXPORT_BOT_ID", "");
      await expect(getAIExportSignedUrls("2024-03-15")).rejects.toThrow("ZENDESK_AI_EXPORT_BOT_ID");
    });
  });
});
