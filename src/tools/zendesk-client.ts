export function getZendeskBaseUrl(): string {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  if (!subdomain) throw new Error("Missing ZENDESK_SUBDOMAIN");
  return `https://${subdomain}.zendesk.com/api/v2`;
}

export function getZendeskAuthHeaders(): Record<string, string> {
  const email = process.env.ZENDESK_EMAIL;
  const token = process.env.ZENDESK_TOKEN;
  if (!email || !token) throw new Error("Missing ZENDESK_EMAIL or ZENDESK_TOKEN");
  const credentials = Buffer.from(`${email}/token:${token}`).toString("base64");
  return {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401) throw new Error("Unauthorized: check ZENDESK_EMAIL and ZENDESK_TOKEN");
    if (response.status === 404) throw new Error(`Not found: ${path}`);
    if (response.status === 429) throw new Error("Rate limited by Zendesk API");
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function zdFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getZendeskBaseUrl()}${path}`, {
    headers: getZendeskAuthHeaders(),
  });
  return handleResponse<T>(response, path);
}

export async function zdMutate<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getZendeskBaseUrl()}${path}`, {
    method,
    headers: getZendeskAuthHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return handleResponse<T>(response, path);
}
