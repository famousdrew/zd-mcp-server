import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getZendeskBaseUrl, getZendeskAuthHeaders } from "./zendesk-client.js";

// Type definitions for Zendesk Ticket Fields API
interface ZendeskFieldOption {
  name: string;
  value: string;
}

interface ZendeskTicketField {
  id: number;
  title: string;
  type: string;
  description: string;
  required: boolean;
  active: boolean;
  custom_field_options?: ZendeskFieldOption[];
}

interface ZendeskTicketFieldsResponse {
  ticket_fields: ZendeskTicketField[];
  count: number;
  next_page: string | null;
  previous_page: string | null;
}

// Type definitions for Zendesk Brands API
interface ZendeskBrand {
  id: number;
  name: string;
  brand_url: string;
  subdomain: string;
  active: boolean;
  default: boolean;
  logo?: {
    url: string;
  };
  ticket_form_ids: number[];
  created_at: string;
  updated_at: string;
}

interface ZendeskBrandsResponse {
  brands: ZendeskBrand[];
  count: number;
  next_page: string | null;
  previous_page: string | null;
}

interface BrandOutput {
  id: number;
  name: string;
  subdomain: string;
  brand_url: string;
  active: boolean;
  default: boolean;
  search_syntax: string;
}

interface ListBrandsOutput {
  brands: BrandOutput[];
  count: number;
}

// Output types for our tools
interface TicketFieldOutput {
  id: number;
  title: string;
  type: string;
  description: string;
  required: boolean;
  active: boolean;
  system_field: boolean;
  options?: ZendeskFieldOption[];
  search_syntax: string;
}

interface ListTicketFieldsOutput {
  ticket_fields: TicketFieldOutput[];
  count: number;
  next_page: string | null;
  previous_page: string | null;
}

interface ErrorOutput {
  error: true;
  message: string;
  code: string;
  details?: any;
}

// System field names that use direct search syntax (not custom_field_)
const SYSTEM_FIELDS = new Set([
  'status', 'priority', 'type', 'group', 'assignee', 'requester',
  'subject', 'description', 'ticket_type', 'brand', 'organization'
]);

const getAuthHeaders = getZendeskAuthHeaders;
const getBaseUrl = getZendeskBaseUrl;

// Helper function to determine search syntax for a field
function getSearchSyntax(field: ZendeskTicketField): string {
  const fieldNameLower = field.title.toLowerCase().replace(/\s+/g, '_');

  // Check if it's a system field
  if (SYSTEM_FIELDS.has(fieldNameLower) || field.type === 'status' || field.type === 'priority' || field.type === 'tickettype') {
    return `${fieldNameLower}:{value}`;
  }

  // For checkbox fields, note the boolean values
  if (field.type === 'checkbox') {
    return `custom_field_${field.id}:true|false`;
  }

  // For all other custom fields
  return `custom_field_${field.id}:{value}`;
}

// Check if a field is a system field
function isSystemField(field: ZendeskTicketField): boolean {
  const fieldNameLower = field.title.toLowerCase().replace(/\s+/g, '_');
  return SYSTEM_FIELDS.has(fieldNameLower) ||
         field.type === 'status' ||
         field.type === 'priority' ||
         field.type === 'tickettype';
}

// Main function to list ticket fields
export async function listTicketFields(args: { page?: number; per_page?: number }): Promise<ListTicketFieldsOutput | ErrorOutput> {
  const page = args.page || 1;
  const perPage = Math.min(args.per_page || 100, 100);

  try {
    const url = `${getBaseUrl()}/ticket_fields?page=${page}&per_page=${perPage}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          error: true,
          message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
          code: "AUTH_FAILED",
        };
      }
      if (response.status === 429) {
        return {
          error: true,
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        };
      }
      return {
        error: true,
        message: `Zendesk API error: ${response.status} ${response.statusText}`,
        code: "API_ERROR",
        details: await response.text(),
      };
    }

    const data: ZendeskTicketFieldsResponse = await response.json();

    // Transform fields to our output format, filtering inactive by default
    const transformedFields: TicketFieldOutput[] = data.ticket_fields
      .filter(field => field.active)
      .map(field => ({
        id: field.id,
        title: field.title,
        type: field.type,
        description: field.description || "",
        required: field.required,
        active: field.active,
        system_field: isSystemField(field),
        options: field.custom_field_options?.map(opt => ({
          name: opt.name,
          value: opt.value,
        })),
        search_syntax: getSearchSyntax(field),
      }));

    return {
      ticket_fields: transformedFields,
      count: transformedFields.length,
      next_page: data.next_page,
      previous_page: data.previous_page,
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Main function to list brands
export async function listBrands(): Promise<ListBrandsOutput | ErrorOutput> {
  try {
    const url = `${getBaseUrl()}/brands`;
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          error: true,
          message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
          code: "AUTH_FAILED",
        };
      }
      if (response.status === 429) {
        return {
          error: true,
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        };
      }
      return {
        error: true,
        message: `Zendesk API error: ${response.status} ${response.statusText}`,
        code: "API_ERROR",
        details: await response.text(),
      };
    }

    const data: ZendeskBrandsResponse = await response.json();

    const transformedBrands: BrandOutput[] = data.brands
      .filter(brand => brand.active)
      .map(brand => ({
        id: brand.id,
        name: brand.name,
        subdomain: brand.subdomain,
        brand_url: brand.brand_url,
        active: brand.active,
        default: brand.default,
        search_syntax: `brand:${brand.id}`,
      }));

    return {
      brands: transformedBrands,
      count: transformedBrands.length,
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Function to fetch all brands (for internal use)
async function getAllBrands(): Promise<ZendeskBrand[] | ErrorOutput> {
  try {
    const url = `${getBaseUrl()}/brands`;
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          error: true,
          message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
          code: "AUTH_FAILED",
        };
      }
      return {
        error: true,
        message: `Zendesk API error: ${response.status} ${response.statusText}`,
        code: "API_ERROR",
      };
    }

    const data: ZendeskBrandsResponse = await response.json();
    return data.brands.filter(b => b.active);
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Function to fetch all ticket fields (for internal use by searchByField)
async function getAllTicketFields(): Promise<ZendeskTicketField[] | ErrorOutput> {
  const allFields: ZendeskTicketField[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${getBaseUrl()}/ticket_fields?page=${page}&per_page=100`;
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          error: true,
          message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
          code: "AUTH_FAILED",
        };
      }
      return {
        error: true,
        message: `Zendesk API error: ${response.status} ${response.statusText}`,
        code: "API_ERROR",
      };
    }

    const data: ZendeskTicketFieldsResponse = await response.json();
    allFields.push(...data.ticket_fields.filter(f => f.active));

    hasMore = data.next_page !== null;
    page++;
  }

  return allFields;
}

// Main function to search by field name
export async function searchByField(args: {
  field_name: string;
  field_value: string;
  status?: string;
  priority?: string;
  created_after?: string;
  created_before?: string;
  max_results?: number;
}): Promise<any> {
  try {
    // First, get all ticket fields
    const fieldsResult = await getAllTicketFields();

    if ('error' in fieldsResult) {
      return fieldsResult;
    }

    const fields = fieldsResult;

    // Find matching fields (case-insensitive partial match on title)
    const searchTerm = args.field_name.toLowerCase();
    const matchingFields = fields.filter(f =>
      f.title.toLowerCase().includes(searchTerm)
    );

    if (matchingFields.length === 0) {
      return {
        error: true,
        message: `No field found matching "${args.field_name}". Use zendesk_list_ticket_fields to see all available fields.`,
        code: "FIELD_NOT_FOUND",
      };
    }

    if (matchingFields.length > 1) {
      // Check for exact match first
      const exactMatch = matchingFields.find(f =>
        f.title.toLowerCase() === searchTerm
      );

      if (!exactMatch) {
        return {
          error: true,
          message: `Multiple fields match "${args.field_name}". Please be more specific.`,
          code: "AMBIGUOUS_FIELD",
          details: matchingFields.map(f => ({
            id: f.id,
            title: f.title,
            type: f.type,
          })),
        };
      }

      // Use the exact match
      matchingFields.length = 0;
      matchingFields.push(exactMatch);
    }

    const field = matchingFields[0];

    // Build the search query
    const queryParts: string[] = ["type:ticket"];

    // Add the custom field search
    if (isSystemField(field)) {
      const fieldNameLower = field.title.toLowerCase().replace(/\s+/g, '_');
      queryParts.push(`${fieldNameLower}:${args.field_value}`);
    } else {
      queryParts.push(`custom_field_${field.id}:${args.field_value}`);
    }

    // Add optional filters
    if (args.status) {
      queryParts.push(`status:${args.status}`);
    }
    if (args.priority) {
      queryParts.push(`priority:${args.priority}`);
    }
    if (args.created_after) {
      queryParts.push(`created>${args.created_after}`);
    }
    if (args.created_before) {
      queryParts.push(`created<${args.created_before}`);
    }

    const query = queryParts.join(" ");
    const maxResults = args.max_results || 100;

    // Execute the search
    const url = `${getBaseUrl()}/search.json?query=${encodeURIComponent(query)}&per_page=${Math.min(maxResults, 100)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          error: true,
          message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
          code: "AUTH_FAILED",
        };
      }
      if (response.status === 429) {
        return {
          error: true,
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        };
      }
      return {
        error: true,
        message: `Zendesk API error: ${response.status} ${response.statusText}`,
        code: "API_ERROR",
        details: await response.text(),
      };
    }

    const searchResults = await response.json();

    return {
      ...searchResults,
      _meta: {
        resolved_field: {
          id: field.id,
          title: field.title,
          type: field.type,
        },
        query_used: query,
      },
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Main function to search by brand
export async function searchByBrand(args: {
  brand_name: string;
  status?: string;
  priority?: string;
  created_after?: string;
  created_before?: string;
  max_results?: number;
}): Promise<any> {
  try {
    // First, get all brands
    const brandsResult = await getAllBrands();

    if ('error' in brandsResult) {
      return brandsResult;
    }

    const brands = brandsResult;

    // Find matching brands (case-insensitive partial match on name)
    const searchTerm = args.brand_name.toLowerCase();
    const matchingBrands = brands.filter(b =>
      b.name.toLowerCase().includes(searchTerm)
    );

    if (matchingBrands.length === 0) {
      return {
        error: true,
        message: `No brand found matching "${args.brand_name}". Use zendesk_list_brands to see all available brands.`,
        code: "BRAND_NOT_FOUND",
        details: brands.map(b => ({ id: b.id, name: b.name })),
      };
    }

    if (matchingBrands.length > 1) {
      // Check for exact match first
      const exactMatch = matchingBrands.find(b =>
        b.name.toLowerCase() === searchTerm
      );

      if (!exactMatch) {
        return {
          error: true,
          message: `Multiple brands match "${args.brand_name}". Please be more specific.`,
          code: "AMBIGUOUS_BRAND",
          details: matchingBrands.map(b => ({
            id: b.id,
            name: b.name,
          })),
        };
      }

      // Use the exact match
      matchingBrands.length = 0;
      matchingBrands.push(exactMatch);
    }

    const brand = matchingBrands[0];

    // Build the search query
    const queryParts: string[] = ["type:ticket"];
    queryParts.push(`brand:${brand.id}`);

    // Add optional filters
    if (args.status) {
      queryParts.push(`status:${args.status}`);
    }
    if (args.priority) {
      queryParts.push(`priority:${args.priority}`);
    }
    if (args.created_after) {
      queryParts.push(`created>${args.created_after}`);
    }
    if (args.created_before) {
      queryParts.push(`created<${args.created_before}`);
    }

    const query = queryParts.join(" ");
    const maxResults = args.max_results || 100;

    // Execute the search
    const url = `${getBaseUrl()}/search.json?query=${encodeURIComponent(query)}&per_page=${Math.min(maxResults, 100)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          error: true,
          message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
          code: "AUTH_FAILED",
        };
      }
      if (response.status === 429) {
        return {
          error: true,
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMITED",
        };
      }
      return {
        error: true,
        message: `Zendesk API error: ${response.status} ${response.statusText}`,
        code: "API_ERROR",
        details: await response.text(),
      };
    }

    const searchResults = await response.json();

    return {
      ...searchResults,
      _meta: {
        resolved_brand: {
          id: brand.id,
          name: brand.name,
        },
        query_used: query,
      },
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Helper function to fetch ticket details with comments
async function fetchTicketWithComments(ticketId: number): Promise<any> {
  try {
    // Fetch ticket
    const ticketUrl = `${getBaseUrl()}/tickets/${ticketId}.json`;
    const ticketResponse = await fetch(ticketUrl, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!ticketResponse.ok) {
      return { error: true, ticketId, message: `Failed to fetch ticket ${ticketId}` };
    }

    const ticketData = await ticketResponse.json();

    // Fetch comments
    const commentsUrl = `${getBaseUrl()}/tickets/${ticketId}/comments.json`;
    const commentsResponse = await fetch(commentsUrl, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    let comments: any[] = [];
    if (commentsResponse.ok) {
      const commentsData = await commentsResponse.json();
      comments = commentsData.comments || [];
    }

    return {
      ...ticketData.ticket,
      comments: comments.map((c: any) => ({
        id: c.id,
        body: c.body,
        plain_body: c.plain_body,
        public: c.public,
        author_id: c.author_id,
        created_at: c.created_at,
      })),
    };
  } catch (error: any) {
    return { error: true, ticketId, message: error.message };
  }
}

// Helper function to process tickets in batches
async function fetchTicketsInBatches(ticketIds: number[], batchSize: number = 10): Promise<any[]> {
  const results: any[] = [];

  for (let i = 0; i < ticketIds.length; i += batchSize) {
    const batch = ticketIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(id => fetchTicketWithComments(id))
    );
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < ticketIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Main function to analyze tickets by brand with full details
export async function analyzeTickets(args: {
  brand_name: string;
  days_back?: number;
  max_tickets?: number;
  status?: string;
  priority?: string;
}): Promise<any> {
  try {
    const daysBack = args.days_back || 30;
    const maxTickets = Math.min(args.max_tickets || 100, 500); // Cap at 500

    // First, get all brands
    const brandsResult = await getAllBrands();

    if ('error' in brandsResult) {
      return brandsResult;
    }

    const brands = brandsResult;

    // Find matching brand
    const searchTerm = args.brand_name.toLowerCase();
    const matchingBrands = brands.filter(b =>
      b.name.toLowerCase().includes(searchTerm)
    );

    if (matchingBrands.length === 0) {
      return {
        error: true,
        message: `No brand found matching "${args.brand_name}". Use zendesk_list_brands to see all available brands.`,
        code: "BRAND_NOT_FOUND",
      };
    }

    if (matchingBrands.length > 1) {
      const exactMatch = matchingBrands.find(b =>
        b.name.toLowerCase() === searchTerm
      );

      if (!exactMatch) {
        return {
          error: true,
          message: `Multiple brands match "${args.brand_name}". Please be more specific.`,
          code: "AMBIGUOUS_BRAND",
          details: matchingBrands.map(b => ({ id: b.id, name: b.name })),
        };
      }

      matchingBrands.length = 0;
      matchingBrands.push(exactMatch);
    }

    const brand = matchingBrands[0];

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Build the search query
    const queryParts: string[] = ["type:ticket"];
    queryParts.push(`brand:${brand.id}`);
    queryParts.push(`created>${startDateStr}`);

    if (args.status) {
      queryParts.push(`status:${args.status}`);
    }
    if (args.priority) {
      queryParts.push(`priority:${args.priority}`);
    }

    const query = queryParts.join(" ");

    // Fetch tickets with pagination
    const allTicketIds: number[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && allTicketIds.length < maxTickets) {
      const remaining = maxTickets - allTicketIds.length;
      const perPage = Math.min(remaining, 100);

      const url = `${getBaseUrl()}/search.json?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&sort_by=created_at&sort_order=desc`;
      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            error: true,
            message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
            code: "AUTH_FAILED",
          };
        }
        if (response.status === 429) {
          return {
            error: true,
            message: "Rate limit exceeded. Please try again later.",
            code: "RATE_LIMITED",
          };
        }
        return {
          error: true,
          message: `Zendesk API error: ${response.status} ${response.statusText}`,
          code: "API_ERROR",
        };
      }

      const searchData = await response.json();
      const ticketIds = searchData.results.map((t: any) => t.id);
      allTicketIds.push(...ticketIds);

      hasMore = searchData.next_page !== null && allTicketIds.length < maxTickets;
      page++;
    }

    if (allTicketIds.length === 0) {
      return {
        brand: { id: brand.id, name: brand.name },
        query_used: query,
        date_range: { start: startDateStr, end: endDate.toISOString().split('T')[0] },
        total_tickets: 0,
        tickets: [],
        message: "No tickets found matching the criteria.",
      };
    }

    // Fetch full ticket details with comments (in batches of 10 for performance)
    const ticketsWithDetails = await fetchTicketsInBatches(allTicketIds, 10);

    // Filter out any errors and collect stats
    const successfulTickets = ticketsWithDetails.filter(t => !t.error);
    const failedCount = ticketsWithDetails.length - successfulTickets.length;

    // Generate summary statistics
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    successfulTickets.forEach((ticket: any) => {
      // Status
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;

      // Priority
      const priority = ticket.priority || 'none';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

      // Type
      const type = ticket.type || 'none';
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      // Tags
      if (ticket.tags) {
        ticket.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    // Sort tags by frequency
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return {
      brand: { id: brand.id, name: brand.name },
      query_used: query,
      date_range: {
        start: startDateStr,
        end: endDate.toISOString().split('T')[0],
        days: daysBack,
      },
      summary: {
        total_tickets: successfulTickets.length,
        failed_to_fetch: failedCount,
        by_status: statusCounts,
        by_priority: priorityCounts,
        by_type: typeCounts,
        top_tags: topTags,
      },
      tickets: successfulTickets.map((ticket: any) => ({
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        tags: ticket.tags,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        requester_id: ticket.requester_id,
        assignee_id: ticket.assignee_id,
        group_id: ticket.group_id,
        custom_fields: ticket.custom_fields,
        comments: ticket.comments,
      })),
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Main function to sample tickets by day for trend analysis
export async function sampleTicketsByDay(args: {
  brand_name: string;
  days_back?: number;
  tickets_per_day?: number;
  status?: string;
  priority?: string;
  include_comments?: boolean;
}): Promise<any> {
  try {
    const daysBack = args.days_back || 20;
    const ticketsPerDay = Math.min(args.tickets_per_day || 25, 50); // Cap at 50 per day
    const includeComments = args.include_comments !== false; // Default true

    // First, get all brands
    const brandsResult = await getAllBrands();

    if ('error' in brandsResult) {
      return brandsResult;
    }

    const brands = brandsResult;

    // Find matching brand
    const searchTerm = args.brand_name.toLowerCase();
    const matchingBrands = brands.filter(b =>
      b.name.toLowerCase().includes(searchTerm)
    );

    if (matchingBrands.length === 0) {
      return {
        error: true,
        message: `No brand found matching "${args.brand_name}". Use zendesk_list_brands to see all available brands.`,
        code: "BRAND_NOT_FOUND",
      };
    }

    if (matchingBrands.length > 1) {
      const exactMatch = matchingBrands.find(b =>
        b.name.toLowerCase() === searchTerm
      );

      if (!exactMatch) {
        return {
          error: true,
          message: `Multiple brands match "${args.brand_name}". Please be more specific.`,
          code: "AMBIGUOUS_BRAND",
          details: matchingBrands.map(b => ({ id: b.id, name: b.name })),
        };
      }

      matchingBrands.length = 0;
      matchingBrands.push(exactMatch);
    }

    const brand = matchingBrands[0];

    // Generate list of days to sample
    const days: { date: string; dayOfWeek: string }[] = [];
    const today = new Date();

    for (let i = 0; i < daysBack; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
      days.push({ date: dateStr, dayOfWeek });
    }

    // Fetch tickets for each day
    const dailyResults: any[] = [];
    const allTicketIds: number[] = [];

    for (const day of days) {
      // Build query for this specific day
      const queryParts: string[] = ["type:ticket"];
      queryParts.push(`brand:${brand.id}`);
      queryParts.push(`created:${day.date}`);

      if (args.status) {
        queryParts.push(`status:${args.status}`);
      }
      if (args.priority) {
        queryParts.push(`priority:${args.priority}`);
      }

      const query = queryParts.join(" ");

      const url = `${getBaseUrl()}/search.json?query=${encodeURIComponent(query)}&per_page=${ticketsPerDay}&sort_by=created_at&sort_order=desc`;
      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            error: true,
            message: "Authentication failed. Check ZENDESK_EMAIL and ZENDESK_TOKEN.",
            code: "AUTH_FAILED",
          };
        }
        if (response.status === 429) {
          // Rate limited - wait and continue
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        continue; // Skip this day on error
      }

      const searchData = await response.json();
      const ticketIds = searchData.results.map((t: any) => t.id);

      dailyResults.push({
        date: day.date,
        day_of_week: day.dayOfWeek,
        ticket_count: searchData.results.length,
        total_available: searchData.count,
        ticket_ids: ticketIds,
      });

      allTicketIds.push(...ticketIds);

      // Small delay between days to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (allTicketIds.length === 0) {
      return {
        brand: { id: brand.id, name: brand.name },
        date_range: {
          start: days[days.length - 1]?.date,
          end: days[0]?.date,
          days: daysBack,
        },
        total_tickets: 0,
        daily_breakdown: dailyResults,
        tickets: [],
        message: "No tickets found matching the criteria.",
      };
    }

    // Fetch full ticket details
    let ticketsWithDetails: any[];
    if (includeComments) {
      ticketsWithDetails = await fetchTicketsInBatches(allTicketIds, 10);
    } else {
      // Just fetch basic ticket info without comments
      ticketsWithDetails = await Promise.all(
        allTicketIds.map(async (id) => {
          const url = `${getBaseUrl()}/tickets/${id}.json`;
          const response = await fetch(url, { method: "GET", headers: getAuthHeaders() });
          if (response.ok) {
            const data = await response.json();
            return data.ticket;
          }
          return { error: true, ticketId: id };
        })
      );
    }

    // Filter out errors
    const successfulTickets = ticketsWithDetails.filter(t => !t.error);
    const failedCount = ticketsWithDetails.length - successfulTickets.length;

    // Generate summary statistics
    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    const dailyVolume: Record<string, number> = {};

    successfulTickets.forEach((ticket: any) => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;

      const priority = ticket.priority || 'none';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

      const type = ticket.type || 'none';
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      if (ticket.tags) {
        ticket.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }

      // Track daily volume
      const createdDate = ticket.created_at?.split('T')[0];
      if (createdDate) {
        dailyVolume[createdDate] = (dailyVolume[createdDate] || 0) + 1;
      }
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    // Group tickets by day
    const ticketsByDay: Record<string, any[]> = {};
    successfulTickets.forEach((ticket: any) => {
      const createdDate = ticket.created_at?.split('T')[0];
      if (createdDate) {
        if (!ticketsByDay[createdDate]) {
          ticketsByDay[createdDate] = [];
        }
        ticketsByDay[createdDate].push({
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          type: ticket.type,
          tags: ticket.tags,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          requester_id: ticket.requester_id,
          assignee_id: ticket.assignee_id,
          group_id: ticket.group_id,
          custom_fields: ticket.custom_fields,
          comments: ticket.comments,
        });
      }
    });

    return {
      brand: { id: brand.id, name: brand.name },
      parameters: {
        days_back: daysBack,
        tickets_per_day: ticketsPerDay,
        include_comments: includeComments,
      },
      date_range: {
        start: days[days.length - 1]?.date,
        end: days[0]?.date,
        days: daysBack,
      },
      summary: {
        total_tickets_sampled: successfulTickets.length,
        failed_to_fetch: failedCount,
        by_status: statusCounts,
        by_priority: priorityCounts,
        by_type: typeCounts,
        top_tags: topTags,
      },
      daily_breakdown: dailyResults.map(day => ({
        ...day,
        sampled: day.ticket_count,
        total_available: day.total_available,
      })),
      tickets_by_day: ticketsByDay,
    };
  } catch (error: any) {
    return {
      error: true,
      message: error.message || "Unknown error occurred",
      code: "API_ERROR",
    };
  }
}

// Schema definitions
const listTicketFieldsSchema = {
  page: z.number().optional().describe("Page number (default: 1)"),
  per_page: z.number().optional().describe("Results per page, max 100 (default: 100)"),
};

const searchByFieldSchema = {
  field_name: z.string().describe("Field name/title to search by (case-insensitive partial match)"),
  field_value: z.string().describe("Value to match"),
  status: z.string().optional().describe("Filter by status (open, pending, solved, closed)"),
  priority: z.string().optional().describe("Filter by priority (low, normal, high, urgent)"),
  created_after: z.string().optional().describe("Filter tickets created after this date (ISO format)"),
  created_before: z.string().optional().describe("Filter tickets created before this date (ISO format)"),
  max_results: z.number().optional().describe("Maximum results to return (default: 100)"),
};

const listBrandsSchema = {};

const searchByBrandSchema = {
  brand_name: z.string().describe("Brand name to search by (case-insensitive partial match)"),
  status: z.string().optional().describe("Filter by status (open, pending, solved, closed)"),
  priority: z.string().optional().describe("Filter by priority (low, normal, high, urgent)"),
  created_after: z.string().optional().describe("Filter tickets created after this date (ISO format)"),
  created_before: z.string().optional().describe("Filter tickets created before this date (ISO format)"),
  max_results: z.number().optional().describe("Maximum results to return (default: 100)"),
};

const analyzeTicketsSchema = {
  brand_name: z.string().describe("Brand name to analyze tickets for (case-insensitive partial match)"),
  days_back: z.number().optional().describe("Number of days to look back (default: 30)"),
  max_tickets: z.number().optional().describe("Maximum tickets to analyze, up to 500 (default: 100)"),
  status: z.string().optional().describe("Filter by status (open, pending, solved, closed)"),
  priority: z.string().optional().describe("Filter by priority (low, normal, high, urgent)"),
};

const sampleTicketsByDaySchema = {
  brand_name: z.string().describe("Brand name to sample tickets for (case-insensitive partial match)"),
  days_back: z.number().optional().describe("Number of days to look back (default: 20)"),
  tickets_per_day: z.number().optional().describe("Number of tickets to sample per day, up to 50 (default: 25)"),
  status: z.string().optional().describe("Filter by status (open, pending, solved, closed)"),
  priority: z.string().optional().describe("Filter by priority (low, normal, high, urgent)"),
  include_comments: z.boolean().optional().describe("Include full comment history (default: true)"),
};

// Register the tools with the MCP server
export function registerTicketFieldTools(server: McpServer) {
  // Cast to any to avoid type instantiation depth issues with MCP SDK + Zod
  const s = server as any;

  s.tool(
    "zendesk_list_ticket_fields",
    "List all ticket fields (system and custom) with their IDs, types, and dropdown options. Useful for discovering field IDs needed for search queries.",
    listTicketFieldsSchema,
    async (args: { page?: number; per_page?: number }) => {
      try {
        const result = await listTicketFields(args);

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
    "zendesk_search_by_field",
    "Search tickets by custom field name and value. Automatically resolves field names to IDs.",
    searchByFieldSchema,
    async (args: {
      field_name: string;
      field_value: string;
      status?: string;
      priority?: string;
      created_after?: string;
      created_before?: string;
      max_results?: number;
    }) => {
      try {
        const result = await searchByField(args);

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
    "zendesk_list_brands",
    "List all Zendesk brands in the account with their IDs and search syntax.",
    listBrandsSchema,
    async () => {
      try {
        const result = await listBrands();

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
    "zendesk_search_by_brand",
    "Search tickets by brand name. Automatically resolves brand names to IDs.",
    searchByBrandSchema,
    async (args: {
      brand_name: string;
      status?: string;
      priority?: string;
      created_after?: string;
      created_before?: string;
      max_results?: number;
    }) => {
      try {
        const result = await searchByBrand(args);

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
    "zendesk_analyze_tickets",
    "Analyze tickets for a brand over a time period. Fetches full ticket details including all comments for root cause analysis. Returns summary statistics and complete ticket data.",
    analyzeTicketsSchema,
    async (args: {
      brand_name: string;
      days_back?: number;
      max_tickets?: number;
      status?: string;
      priority?: string;
    }) => {
      try {
        const result = await analyzeTickets(args);

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
    "zendesk_sample_tickets",
    "Sample N tickets per day over X days for trend analysis. Returns tickets grouped by day with daily volume breakdown. Useful for identifying patterns and trends over time without one busy day dominating the data.",
    sampleTicketsByDaySchema,
    async (args: {
      brand_name: string;
      days_back?: number;
      tickets_per_day?: number;
      status?: string;
      priority?: string;
      include_comments?: boolean;
    }) => {
      try {
        const result = await sampleTicketsByDay(args);

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
