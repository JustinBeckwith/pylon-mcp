const PYLON_API_BASE = 'https://api.usepylon.com';

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
		return this.request<PaginatedResponse<Account>>(
			'POST',
			'/accounts/search',
			{
				filter,
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
		return this.request<PaginatedResponse<Contact>>(
			'POST',
			'/contacts/search',
			{
				filter,
				limit: params?.limit,
				cursor: params?.cursor,
			},
		);
	}

	// Issues
	async listIssues(
		startTime: string,
		endTime: string,
	): Promise<PaginatedResponse<Issue>> {
		const searchParams = new URLSearchParams();
		searchParams.set('start_time', startTime);
		searchParams.set('end_time', endTime);
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
		return this.request<PaginatedResponse<Issue>>('POST', '/issues/search', {
			filter,
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
	): Promise<PaginatedResponse<{ id: string; email: string }>> {
		return this.request<PaginatedResponse<{ id: string; email: string }>>(
			'GET',
			`/issues/${id}/followers`,
		);
	}

	async updateIssueFollowers(
		id: string,
		data: { add_user_ids?: string[]; remove_user_ids?: string[] },
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
