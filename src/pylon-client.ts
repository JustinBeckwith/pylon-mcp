const PYLON_API_BASE = 'https://api.usepylon.com';

// Pylon API allows max 30 days for time range queries
const MAX_TIME_RANGE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Validates that a time range does not exceed the maximum allowed duration.
 * @throws Error if the time range exceeds MAX_TIME_RANGE_DAYS
 */
function validateTimeRange(startTime: string, endTime: string): void {
	const start = new Date(startTime);
	const end = new Date(endTime);

	if (Number.isNaN(start.getTime())) {
		throw new Error(`Invalid start_time format: ${startTime}. Use RFC3339 format (e.g., 2024-01-01T00:00:00Z)`);
	}
	if (Number.isNaN(end.getTime())) {
		throw new Error(`Invalid end_time format: ${endTime}. Use RFC3339 format (e.g., 2024-01-31T00:00:00Z)`);
	}
	if (start >= end) {
		throw new Error('start_time must be before end_time');
	}

	const diffDays = (end.getTime() - start.getTime()) / MS_PER_DAY;
	if (diffDays > MAX_TIME_RANGE_DAYS) {
		throw new Error(
			`Time range cannot exceed ${MAX_TIME_RANGE_DAYS} days. Requested: ${diffDays.toFixed(1)} days. Try a shorter range like 28 days.`,
		);
	}
}

/**
 * Validates time_range operators within a filter object.
 * @throws Error if any time_range exceeds MAX_TIME_RANGE_DAYS
 */
function validateFilterTimeRanges(filter: Record<string, unknown>): void {
	for (const [fieldName, fieldValue] of Object.entries(filter)) {
		if (
			typeof fieldValue === 'object' &&
			fieldValue !== null &&
			!Array.isArray(fieldValue)
		) {
			const fieldObj = fieldValue as Record<string, unknown>;
			if (fieldObj['time_range']) {
				const timeRange = fieldObj['time_range'] as {
					start?: string;
					end?: string;
				};
				if (timeRange.start && timeRange.end) {
					try {
						validateTimeRange(timeRange.start, timeRange.end);
					} catch (error) {
						throw new Error(
							`Invalid time_range for ${fieldName}: ${(error as Error).message}`,
						);
					}
				}
			}
		}
	}
}

/**
 * Valid operators for each field type in Pylon filters.
 * The LLM sometimes hallucinates operators (e.g., "gte" instead of "time_is_after"),
 * so we need to validate and only pass through recognized operators.
 */
const VALID_OPERATORS: Record<string, Set<string>> = {
	// Time fields
	created_at: new Set(['time_is_after', 'time_is_before', 'time_range']),
	resolved_at: new Set(['time_is_after', 'time_is_before', 'time_range']),
	latest_message_activity_at: new Set(['time_is_after', 'time_is_before', 'time_range']),

	// String search fields (body_html is NOT supported by Pylon API)
	title: new Set(['string_contains', 'string_does_not_contain']),

	// ID fields
	id: new Set(['equals', 'in', 'not_in']),
	account_id: new Set(['equals', 'in', 'not_in', 'is_set', 'is_unset']),
	requester_id: new Set(['equals', 'in', 'not_in', 'is_set', 'is_unset']),
	assignee_id: new Set(['equals', 'in', 'not_in', 'is_set', 'is_unset']),
	team_id: new Set(['equals', 'in', 'not_in', 'is_set', 'is_unset']),
	ticket_form_id: new Set(['equals', 'in', 'not_in', 'is_set', 'is_unset']),
	follower_user_id: new Set(['equals', 'in', 'not_in']),
	follower_contact_id: new Set(['equals', 'in', 'not_in']),

	// Enum/state fields
	state: new Set(['equals', 'in', 'not_in']),
	issue_type: new Set(['equals', 'in', 'not_in']),

	// Tag fields
	tags: new Set(['contains', 'does_not_contain', 'in', 'not_in']),

	// Account-specific fields
	domains: new Set(['contains', 'does_not_contain']),
	name: new Set(['equals', 'string_contains']),
	external_ids: new Set(['equals', 'in', 'not_in', 'is_set', 'is_unset']),

	// Contact-specific fields
	email: new Set(['equals', 'string_contains', 'in', 'not_in']),
};

/**
 * Recursively cleans a filter object by:
 * 1. Removing empty objects and undefined/null values
 * 2. Only keeping valid operators for each field
 * This prevents sending invalid filters to the Pylon API.
 */
function cleanFilter(
	obj: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const result: Record<string, unknown> = {};

	for (const [fieldName, fieldValue] of Object.entries(obj)) {
		if (fieldValue === undefined || fieldValue === null) {
			continue;
		}

		if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
			const fieldObj = fieldValue as Record<string, unknown>;
			const validOperators = VALID_OPERATORS[fieldName];

			if (validOperators) {
				// This is a known field - filter to only valid operators
				const cleanedOperators: Record<string, unknown> = {};
				for (const [op, opValue] of Object.entries(fieldObj)) {
					if (validOperators.has(op) && opValue !== undefined && opValue !== null) {
						// For time_range, recursively clean but keep structure
						if (op === 'time_range' && typeof opValue === 'object') {
							cleanedOperators[op] = opValue;
						} else {
							cleanedOperators[op] = opValue;
						}
					}
					// Silently drop invalid operators to avoid API errors
				}
				if (Object.keys(cleanedOperators).length > 0) {
					result[fieldName] = cleanedOperators;
				}
			} else {
				// Unknown field - recursively clean but keep it
				const cleaned = cleanFilter(fieldObj);
				if (cleaned && Object.keys(cleaned).length > 0) {
					result[fieldName] = cleaned;
				}
			}
		} else {
			result[fieldName] = fieldValue;
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

export interface PylonConfig {
	apiToken: string;
}

export interface PaginationParams {
	limit?: number;
	cursor?: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		cursor: string | null;
		has_next_page: boolean;
	};
	request_id: string;
}

export interface SingleResponse<T> {
	data: T;
	request_id: string;
}

export interface Organization {
	id: string;
	name: string;
}

export interface Account {
	id: string;
	name: string;
	domains?: string[];
	primary_domain?: string;
	logo_url?: string;
	owner_id?: string;
	channels?: object[];
	custom_fields?: object;
	external_ids?: object[];
	tags?: string[];
}

export interface Contact {
	id: string;
	name: string;
	email?: string;
	emails?: string[];
	avatar_url?: string;
	account?: { id: string; name: string };
	custom_fields?: object;
	portal_role?: string;
}

export interface Issue {
	id: string;
	title: string;
	state: string;
	priority?: string;
	body_html?: string;
	assignee_id?: string;
	team_id?: string;
	account_id?: string;
	contact_id?: string;
	requester_id?: string;
	tags?: string[];
	created_at?: string;
	updated_at?: string;
	customer_portal_visible?: boolean;
	issue_type?: string;
}

export interface Message {
	id: string;
	message_html: string;
	author: {
		avatar_url?: string;
		name: string;
		contact?: { email: string; id: string };
		user?: { email: string; id: string };
	};
	is_private: boolean;
	source: string;
	thread_id: string;
	timestamp: string;
	file_urls?: string[];
	email_info?: {
		from_email: string;
		to_emails: string[];
		cc_emails?: string[];
		bcc_emails?: string[];
	};
}

export interface Tag {
	id: string;
	value: string;
	object_type: 'account' | 'issue' | 'contact';
	hex_color?: string;
}

export interface Team {
	id: string;
	name: string;
	users: { email: string; id: string }[];
}

export interface User {
	id: string;
	email: string;
	name?: string;
}

export class PylonClient {
	private apiToken: string;

	constructor(config: PylonConfig) {
		this.apiToken = config.apiToken;
	}

	private async request<T>(
		method: string,
		path: string,
		body?: object,
	): Promise<T> {
		const url = `${PYLON_API_BASE}${path}`;
		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.apiToken}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		};

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Pylon API error: ${response.status} ${response.statusText} - ${errorText}`,
			);
		}

		return response.json() as Promise<T>;
	}

	// Organization
	async getMe(): Promise<SingleResponse<Organization>> {
		return this.request<SingleResponse<Organization>>('GET', '/me');
	}

	// Accounts
	async listAccounts(
		params?: PaginationParams,
	): Promise<PaginatedResponse<Account>> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		const query = searchParams.toString();
		return this.request<PaginatedResponse<Account>>(
			'GET',
			`/accounts${query ? `?${query}` : ''}`,
		);
	}

	async getAccount(id: string): Promise<SingleResponse<Account>> {
		return this.request<SingleResponse<Account>>('GET', `/accounts/${id}`);
	}

	async createAccount(
		data: Partial<Account> & { name: string },
	): Promise<SingleResponse<Account>> {
		return this.request<SingleResponse<Account>>('POST', '/accounts', data);
	}

	async updateAccount(
		id: string,
		data: Partial<Account>,
	): Promise<SingleResponse<Account>> {
		return this.request<SingleResponse<Account>>(
			'PATCH',
			`/accounts/${id}`,
			data,
		);
	}

	async deleteAccount(
		id: string,
	): Promise<SingleResponse<{ success: boolean }>> {
		return this.request<SingleResponse<{ success: boolean }>>(
			'DELETE',
			`/accounts/${id}`,
		);
	}

	async searchAccounts(
		filter: object,
		params?: PaginationParams,
	): Promise<PaginatedResponse<Account>> {
		const cleanedFilter = cleanFilter(filter as Record<string, unknown>);
		return this.request<PaginatedResponse<Account>>(
			'POST',
			'/accounts/search',
			{
				filter: cleanedFilter ?? {},
				limit: params?.limit,
				cursor: params?.cursor,
			},
		);
	}

	// Contacts
	async listContacts(
		params?: PaginationParams,
	): Promise<PaginatedResponse<Contact>> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		const query = searchParams.toString();
		return this.request<PaginatedResponse<Contact>>(
			'GET',
			`/contacts${query ? `?${query}` : ''}`,
		);
	}

	async getContact(id: string): Promise<SingleResponse<Contact>> {
		return this.request<SingleResponse<Contact>>('GET', `/contacts/${id}`);
	}

	async createContact(
		data: Partial<Contact> & { name: string },
	): Promise<SingleResponse<Contact>> {
		return this.request<SingleResponse<Contact>>('POST', '/contacts', data);
	}

	async updateContact(
		id: string,
		data: Partial<Contact>,
	): Promise<SingleResponse<Contact>> {
		return this.request<SingleResponse<Contact>>(
			'PATCH',
			`/contacts/${id}`,
			data,
		);
	}

	async deleteContact(
		id: string,
	): Promise<SingleResponse<{ success: boolean }>> {
		return this.request<SingleResponse<{ success: boolean }>>(
			'DELETE',
			`/contacts/${id}`,
		);
	}

	async searchContacts(
		filter: object,
		params?: PaginationParams,
	): Promise<PaginatedResponse<Contact>> {
		const cleanedFilter = cleanFilter(filter as Record<string, unknown>);
		return this.request<PaginatedResponse<Contact>>(
			'POST',
			'/contacts/search',
			{
				filter: cleanedFilter ?? {},
				limit: params?.limit,
				cursor: params?.cursor,
			},
		);
	}

	// Issues
	async listIssues(
		startTime: string,
		endTime: string,
		params?: PaginationParams,
	): Promise<PaginatedResponse<Issue>> {
		validateTimeRange(startTime, endTime);
		const searchParams = new URLSearchParams();
		searchParams.set('start_time', startTime);
		searchParams.set('end_time', endTime);
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		return this.request<PaginatedResponse<Issue>>(
			'GET',
			`/issues?${searchParams.toString()}`,
		);
	}

	async getIssue(id: string): Promise<SingleResponse<Issue>> {
		return this.request<SingleResponse<Issue>>('GET', `/issues/${id}`);
	}

	async createIssue(data: {
		title: string;
		body_html: string;
		account_id?: string;
		assignee_id?: string;
		contact_id?: string;
		requester_id?: string;
		user_id?: string;
		tags?: string[];
		attachment_urls?: string[];
		custom_fields?: object[];
		priority?: 'urgent' | 'high' | 'medium' | 'low';
		destination_metadata?: object;
	}): Promise<SingleResponse<Issue>> {
		return this.request<SingleResponse<Issue>>('POST', '/issues', data);
	}

	async updateIssue(
		id: string,
		data: {
			state?: string;
			title?: string;
			tags?: string[];
			assignee_id?: string;
			team_id?: string;
			account_id?: string;
			customer_portal_visible?: boolean;
			priority?: 'urgent' | 'high' | 'medium' | 'low';
		},
	): Promise<SingleResponse<Issue>> {
		return this.request<SingleResponse<Issue>>('PATCH', `/issues/${id}`, data);
	}

	async deleteIssue(id: string): Promise<SingleResponse<{ success: boolean }>> {
		return this.request<SingleResponse<{ success: boolean }>>(
			'DELETE',
			`/issues/${id}`,
		);
	}

	async searchIssues(
		filter: object,
		params?: PaginationParams,
	): Promise<PaginatedResponse<Issue>> {
		const filterRecord = filter as Record<string, unknown>;
		validateFilterTimeRanges(filterRecord);
		const cleanedFilter = cleanFilter(filterRecord);

		// Debug: log filters to stderr (shows in Claude Desktop logs)
		console.error('[pylon-mcp] searchIssues raw:', JSON.stringify(filterRecord));
		console.error('[pylon-mcp] searchIssues cleaned:', JSON.stringify(cleanedFilter ?? {}));

		return this.request<PaginatedResponse<Issue>>('POST', '/issues/search', {
			filter: cleanedFilter ?? {},
			limit: params?.limit,
			cursor: params?.cursor,
		});
	}

	async snoozeIssue(
		id: string,
		snooze_until: string,
	): Promise<SingleResponse<Issue>> {
		return this.request<SingleResponse<Issue>>('POST', `/issues/${id}/snooze`, {
			snooze_until,
		});
	}

	async getIssueFollowers(
		id: string,
		params?: PaginationParams,
	): Promise<PaginatedResponse<{ id: string; email: string }>> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		const query = searchParams.toString();
		return this.request<PaginatedResponse<{ id: string; email: string }>>(
			'GET',
			`/issues/${id}/followers${query ? `?${query}` : ''}`,
		);
	}

	async updateIssueFollowers(
		id: string,
		data: {
			user_ids?: string[];
			contact_ids?: string[];
			operation?: 'add' | 'remove';
		},
	): Promise<SingleResponse<{ success: boolean }>> {
		return this.request<SingleResponse<{ success: boolean }>>(
			'POST',
			`/issues/${id}/followers`,
			data,
		);
	}

	// Messages
	async redactMessage(
		issueId: string,
		messageId: string,
	): Promise<SingleResponse<Message>> {
		return this.request<SingleResponse<Message>>(
			'POST',
			`/issues/${issueId}/messages/${messageId}/redact`,
		);
	}

	// Tags
	async listTags(params?: PaginationParams): Promise<PaginatedResponse<Tag>> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		const query = searchParams.toString();
		return this.request<PaginatedResponse<Tag>>(
			'GET',
			`/tags${query ? `?${query}` : ''}`,
		);
	}

	async getTag(id: string): Promise<SingleResponse<Tag>> {
		return this.request<SingleResponse<Tag>>('GET', `/tags/${id}`);
	}

	async createTag(data: {
		value: string;
		object_type: 'account' | 'issue' | 'contact';
		hex_color?: string;
	}): Promise<SingleResponse<Tag>> {
		return this.request<SingleResponse<Tag>>('POST', '/tags', data);
	}

	async updateTag(
		id: string,
		data: { value?: string; hex_color?: string },
	): Promise<SingleResponse<Tag>> {
		return this.request<SingleResponse<Tag>>('PATCH', `/tags/${id}`, data);
	}

	async deleteTag(id: string): Promise<SingleResponse<{ success: boolean }>> {
		return this.request<SingleResponse<{ success: boolean }>>(
			'DELETE',
			`/tags/${id}`,
		);
	}

	// Teams
	async listTeams(params?: PaginationParams): Promise<PaginatedResponse<Team>> {
		const searchParams = new URLSearchParams();
		if (params?.limit) searchParams.set('limit', params.limit.toString());
		if (params?.cursor) searchParams.set('cursor', params.cursor);
		const query = searchParams.toString();
		return this.request<PaginatedResponse<Team>>(
			'GET',
			`/teams${query ? `?${query}` : ''}`,
		);
	}

	async getTeam(id: string): Promise<SingleResponse<Team>> {
		return this.request<SingleResponse<Team>>('GET', `/teams/${id}`);
	}

	async createTeam(data: {
		name?: string;
		user_ids?: string[];
	}): Promise<SingleResponse<Team>> {
		return this.request<SingleResponse<Team>>('POST', '/teams', data);
	}

	async updateTeam(
		id: string,
		data: { name?: string; user_ids?: string[] },
	): Promise<SingleResponse<Team>> {
		return this.request<SingleResponse<Team>>('PATCH', `/teams/${id}`, data);
	}
}
