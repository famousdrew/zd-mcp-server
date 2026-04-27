import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTicket, searchTickets, getTicketDetails, getLinkedIncidents } from "../index.js";

const ENV = {
  ZENDESK_EMAIL: "test@example.com",
  ZENDESK_TOKEN: "testtoken123",
  ZENDESK_SUBDOMAIN: "testcompany",
};

function makeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe("zendesk-core", () => {
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

  describe("getTicket", () => {
    it("calls correct endpoint and unwraps ticket", async () => {
      const ticket = { id: 42, subject: "Test", status: "open" };
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { ticket }));

      const result = await getTicket(42);

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://testcompany.zendesk.com/api/v2/tickets/42");
      expect(result).toEqual(ticket);
    });

    it("sends Basic auth header", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { ticket: {} }));
      await getTicket(1);

      const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      const auth = (options.headers as Record<string, string>).Authorization;
      const decoded = Buffer.from(auth.replace("Basic ", ""), "base64").toString();
      expect(decoded).toBe("test@example.com/token:testtoken123");
    });

    it("throws on 404", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(404, {}));
      await expect(getTicket(99999)).rejects.toThrow("Not found");
    });

    it("throws on 401", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(401, {}));
      await expect(getTicket(1)).rejects.toThrow("Unauthorized");
    });

    it("throws on 429", async () => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(429, {}));
      await expect(getTicket(1)).rejects.toThrow("Rate limited");
    });
  });

  describe("searchTickets", () => {
    it("encodes query and calls search endpoint", async () => {
      const results = { results: [], count: 0, next_page: null };
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, results));

      await searchTickets("status:open priority:urgent");

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/search?query=");
      expect(url).toContain(encodeURIComponent("status:open priority:urgent"));
    });

    it("returns full search response", async () => {
      const results = { results: [{ id: 1 }], count: 1, next_page: null };
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, results));

      const result = await searchTickets("status:open");
      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
    });
  });

  describe("getTicketDetails", () => {
    it("fetches ticket and comments in parallel and combines them", async () => {
      const ticket = { id: 5, subject: "Help" };
      const comments = [{ id: 100, body: "First comment" }];

      vi.mocked(fetch)
        .mockResolvedValueOnce(makeResponse(200, { ticket }))
        .mockResolvedValueOnce(makeResponse(200, { comments }));

      const result = await getTicketDetails(5);

      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
      expect(result.ticket).toEqual(ticket);
      expect(result.comments).toEqual(comments);
    });

    it("calls ticket and comments endpoints", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(makeResponse(200, { ticket: {} }))
        .mockResolvedValueOnce(makeResponse(200, { comments: [] }));

      await getTicketDetails(7);

      const urls = vi.mocked(fetch).mock.calls.map(([url]) => url as string);
      expect(urls.some(u => u.includes("/tickets/7"))).toBe(true);
      expect(urls.some(u => u.includes("/tickets/7/comments"))).toBe(true);
    });
  });

  describe("getLinkedIncidents", () => {
    it("calls incidents endpoint and unwraps tickets array", async () => {
      const tickets = [{ id: 10 }, { id: 11 }];
      vi.mocked(fetch).mockResolvedValue(makeResponse(200, { tickets }));

      const result = await getLinkedIncidents(3);

      const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/tickets/3/incidents");
      expect(result).toEqual(tickets);
    });
  });
});
