import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTicketMetrics, getTicketAudits, getIncrementalTickets, listTicketMetrics } from "../zendesk-analytics.js";

const ENV = {
  ZENDESK_EMAIL: "test@example.com",
  ZENDESK_TOKEN: "testtoken123",
  ZENDESK_SUBDOMAIN: "testcompany",
};

function makeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe("zendesk-analytics", () => {
  beforeEach(() => {
    vi.stubEnv("ZENDESK_EMAIL", ENV.ZENDESK_EMAIL);
    vi.stubEnv("ZENDESK_TOKEN", ENV.ZENDESK_TOKEN);
    vi.stubEnv("ZENDESK_SUBDOMAIN", ENV.ZENDESK_SUBDOMAIN);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("getTicketMetrics", () => {
    it("calls correct endpoint and returns data", async () => {
      const mockData = { ticket_metric: { id: 1, ticket_id: 42, reply_time_in_minutes: { calendar: 15 } } };
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, mockData));

      const result = await getTicketMetrics(42);

      expect(fetch).toHaveBeenCalledOnce();
      const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://testcompany.zendesk.com/api/v2/tickets/42/metrics");
      expect(options.headers).toMatchObject({ Authorization: expect.stringMatching(/^Basic /) });
      expect(result).toEqual(mockData);
    });

    it("uses correct Basic auth encoding", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, {}));
      await getTicketMetrics(1);

      const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      const authHeader = (options.headers as Record<string, string>).Authorization;
      const encoded = authHeader.replace("Basic ", "");
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      expect(decoded).toBe("test@example.com/token:testtoken123");
    });

    it("throws on 401", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(401, { error: "Unauthorized" }));
      await expect(getTicketMetrics(1)).rejects.toThrow("Unauthorized");
    });

    it("throws on 404", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(404, {}));
      await expect(getTicketMetrics(99999)).rejects.toThrow("Not found");
    });

    it("throws on 429", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(429, {}));
      await expect(getTicketMetrics(1)).rejects.toThrow("Rate limited");
    });
  });

  describe("getTicketAudits", () => {
    it("calls correct endpoint", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { audits: [] }));
      await getTicketAudits(123);

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://testcompany.zendesk.com/api/v2/tickets/123/audits");
    });
  });

  describe("listTicketMetrics", () => {
    it("calls base endpoint with no params", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { ticket_metrics: [] }));
      await listTicketMetrics();

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://testcompany.zendesk.com/api/v2/ticket_metrics");
    });

    it("appends page and per_page params", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { ticket_metrics: [] }));
      await listTicketMetrics(2, 50);

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain("page=2");
      expect(url).toContain("per_page=50");
    });

    it("caps per_page at 100", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { ticket_metrics: [] }));
      await listTicketMetrics(1, 500);

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain("per_page=100");
    });
  });

  describe("getIncrementalTickets", () => {
    it("uses cursor param when provided", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { tickets: [], after_cursor: "abc" }));
      await getIncrementalTickets(undefined, "mycursor");

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain("cursor=mycursor");
      expect(url).not.toContain("start_time");
    });

    it("uses start_time when no cursor provided", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { tickets: [] }));
      const ts = Math.floor(Date.now() / 1000) - 7 * 86400;
      await getIncrementalTickets(ts);

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain(`start_time=${ts}`);
    });

    it("defaults to ~30 days ago when no args", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { tickets: [] }));
      const before = Math.floor(Date.now() / 1000) - 30 * 86400;
      await getIncrementalTickets();

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      const match = url.match(/start_time=(\d+)/);
      expect(match).not.toBeNull();
      const usedTs = parseInt(match![1], 10);
      // Should be within 5 seconds of expected default
      expect(Math.abs(usedTs - before)).toBeLessThan(5);
    });
  });

  describe("missing env vars", () => {
    it("throws when ZENDESK_SUBDOMAIN is missing", async () => {
      vi.stubEnv("ZENDESK_SUBDOMAIN", "");
      await expect(getTicketMetrics(1)).rejects.toThrow("Missing ZENDESK_SUBDOMAIN");
    });

    it("throws when ZENDESK_EMAIL is missing", async () => {
      vi.stubEnv("ZENDESK_EMAIL", "");
      await expect(getTicketMetrics(1)).rejects.toThrow(/Missing ZENDESK_EMAIL/);
    });
  });
});
