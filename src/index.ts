#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PylonClient } from './pylon-client.js';
import {
	toIssueMinimal,
	toIssueStandard,
	toIssueFull,
	toAccountMinimal,
	toContactMinimal,
	toTeamMinimal,
	type IssueMinimal,
	type AccountMinimal,
	type ContactMinimal,
} from './schemas.js';

const PYLON_API_TOKEN = process.env['PYLON_API_TOKEN'];

if (!PYLON_API_TOKEN) {
	console.error('Error: PYLON_API_TOKEN environment variable is required');
	process.exit(1);
}

const client = new PylonClient({ apiToken: PYLON_API_TOKEN });

const DEFAULT_ISSUE_LIMIT = 25;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;
const MAX_TITLE_LENGTH = 60;
const MAX_NAME_LENGTH = 40;

/**
 * Escapes pipe characters in markdown table cells.
 */
function escapeCell(value: string | undefined | null): string {
	if (!value) return '';
	return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Truncates a string to a maximum length.
 */
function truncate(value: string | undefined | null, maxLength: number): string {
	if (!value) return '';
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 3)}...`;
}

/**
 * Formats issues as a markdown table for compact, token-efficient output.
 */
function formatIssuesAsTable(issues: IssueMinimal[]): string {
	if (issues.length === 0) {
		return 'No issues found.';
	}

	const headers = ['#', 'Title', 'State', 'Created', 'Link'];
	const rows = issues.map((issue) => [
		escapeCell(String(issue.number ?? '')),
		escapeCell(truncate(issue.title, MAX_TITLE_LENGTH)),
		escapeCell(issue.state),
		escapeCell(issue.created_at?.split('T')[0] || '-'),
		issue.link || '-',
	]);

	const headerRow = `| ${headers.join(' | ')} |`;
	const separatorRow = `|${headers.map(() => '---').join('|')}|`;
	const dataRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

	return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

/**
 * Formats accounts as a markdown table for compact, token-efficient output.
 */
function formatAccountsAsTable(accounts: AccountMinimal[]): string {
	if (accounts.length === 0) {
		return 'No accounts found.';
	}

	const headers = ['ID', 'Name', 'Domain', 'Tags'];
	const rows = accounts.map((account) => [
		escapeCell(account.id),
		escapeCell(truncate(account.name, MAX_NAME_LENGTH)),
		escapeCell(account.primary_domain || '-'),
		escapeCell((account.tags || []).slice(0, 3).join(', ') || '-'),
	]);

	const headerRow = `| ${headers.join(' | ')} |`;
	const separatorRow = `|${headers.map(() => '---').join('|')}|`;
	const dataRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

	return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

/**
 * Formats contacts as a markdown table for compact, token-efficient output.
 */
function formatContactsAsTable(contacts: ContactMinimal[]): string {
	if (contacts.length === 0) {
		return 'No contacts found.';
	}

	const headers = ['ID', 'Name', 'Email', 'Account ID'];
	const rows = contacts.map((contact) => [
		escapeCell(contact.id),
		escapeCell(truncate(contact.name, MAX_NAME_LENGTH)),
		escapeCell(contact.email || '-'),
		escapeCell(contact.account_id || '-'),
	]);

	const headerRow = `| ${headers.join(' | ')} |`;
	const separatorRow = `|${headers.map(() => '---').join('|')}|`;
	const dataRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

	return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

/**
 * Formats tags as a markdown table for compact, token-efficient output.
 */
function formatTagsAsTable(tags: Record<string, unknown>[]): string {
	if (tags.length === 0) {
		return 'No tags found.';
	}

	const headers = ['ID', 'Value', 'Type', 'Color'];
	const rows = tags.map((tag) => [
		escapeCell(tag['id'] as string),
		escapeCell(tag['value'] as string),
		escapeCell(tag['object_type'] as string),
		escapeCell((tag['hex_color'] as string) || '-'),
	]);

	const headerRow = `| ${headers.join(' | ')} |`;
	const separatorRow = `|${headers.map(() => '---').join('|')}|`;
	const dataRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

	return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

/**
 * Formats teams as a markdown table for compact, token-efficient output.
 */
function formatTeamsAsTable(teams: Record<string, unknown>[]): string {
	if (teams.length === 0) {
		return 'No teams found.';
	}

	const headers = ['ID', 'Name', 'Members'];
	const rows = teams.map((team) => {
		const users = (team['users'] as { email: string }[]) || [];
		const memberCount = users.length;
		const memberPreview =
			memberCount > 0
				? `${memberCount} member${memberCount !== 1 ? 's' : ''}`
				: '-';
		return [
			escapeCell(team['id'] as string),
			escapeCell(truncate(team['name'] as string, MAX_NAME_LENGTH)),
			memberPreview,
		];
	});

	const headerRow = `| ${headers.join(' | ')} |`;
	const separatorRow = `|${headers.map(() => '---').join('|')}|`;
	const dataRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

	return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

const server = new McpServer({
	name: 'pylon-mcp',
	version: '1.0.0',
});

// ============================================================================
// Organization Tools
// ============================================================================

server.tool(
	'pylon_get_organization',
	'Get information about your Pylon organization',
	{},
	async () => {
		const result = await client.getMe();
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

// ============================================================================
// Account Tools
// ============================================================================

server.tool(
	'pylon_list_accounts',
	'List accounts. Returns compact table. Use pylon_get_account for details.',
	{
		limit: z
			.number()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(
				`Number of accounts to return (1-${MAX_LIST_LIMIT}, default ${DEFAULT_LIST_LIMIT})`,
			),
		cursor: z.string().optional().describe('Pagination cursor for next page'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listAccounts({
			limit: limit ?? DEFAULT_LIST_LIMIT,
			cursor,
		});

		// Transform to minimal format to reduce context size
		const accounts = result.data.map((raw) =>
			toAccountMinimal(raw as unknown as Record<string, unknown>),
		);

		const table = formatAccountsAsTable(accounts);
		const pagination = result.pagination.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

server.tool(
	'pylon_get_account',
	'Get account details by ID.',
	{
		id: z.string().describe('The account ID or external ID'),
	},
	async ({ id }) => {
		const result = await client.getAccount(id);
		// Return minimal fields to reduce context size
		const account = toAccountMinimal(result.data as unknown as Record<string, unknown>);
		return {
			content: [{ type: 'text', text: JSON.stringify(account, null, 2) }],
		};
	},
);

server.tool(
	'pylon_create_account',
	'Create a new account in Pylon',
	{
		name: z.string().describe('The name of the account'),
		domains: z
			.array(z.string())
			.optional()
			.describe('List of domains associated with the account'),
		primary_domain: z.string().optional().describe('Primary domain'),
		logo_url: z.string().optional().describe('URL of the account logo'),
		owner_id: z.string().optional().describe('ID of the account owner'),
		tags: z
			.array(z.string())
			.optional()
			.describe('Tags to apply to the account'),
	},
	async (params) => {
		const result = await client.createAccount(params);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_update_account',
	'Update an existing account',
	{
		id: z.string().describe('The account ID'),
		name: z.string().optional().describe('New name for the account'),
		domains: z.array(z.string()).optional().describe('Updated list of domains'),
		primary_domain: z.string().optional().describe('Updated primary domain'),
		logo_url: z.string().optional().describe('Updated logo URL'),
		owner_id: z.string().optional().describe('Updated owner ID'),
		tags: z.array(z.string()).optional().describe('Updated tags'),
	},
	async ({ id, ...data }) => {
		const result = await client.updateAccount(id, data);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_delete_account',
	'Delete an account',
	{
		id: z.string().describe('The account ID to delete'),
	},
	async ({ id }) => {
		const result = await client.deleteAccount(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

server.tool(
	'pylon_search_accounts',
	'Search accounts with filters. Returns compact table.',
	{
		filter: z
			.object({
				domains: z
					.object({
						contains: z.string().optional(),
						does_not_contain: z.string().optional(),
					})
					.optional()
					.describe('Filter by domains'),
				tags: z
					.object({
						contains: z.string().optional(),
						does_not_contain: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe('Filter by tags'),
				name: z
					.object({
						equals: z.string().optional(),
						string_contains: z.string().optional(),
					})
					.optional()
					.describe('Filter by account name'),
				external_ids: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
						is_set: z.boolean().optional(),
						is_unset: z.boolean().optional(),
					})
					.optional()
					.describe('Filter by external IDs'),
			})
			.describe(
				'Filter object. Each field requires an operator like {name: {string_contains: "acme"}}',
			),
		limit: z
			.number()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(
				`Results limit (1-${MAX_LIST_LIMIT}, default ${DEFAULT_LIST_LIMIT})`,
			),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ filter, limit, cursor }) => {
		const result = await client.searchAccounts(filter, {
			limit: limit ?? DEFAULT_LIST_LIMIT,
			cursor,
		});

		// Transform to minimal format to reduce context size
		const accounts = (result.data || []).map((raw) =>
			toAccountMinimal(raw as unknown as Record<string, unknown>),
		);

		const table = formatAccountsAsTable(accounts);
		const pagination = result.pagination?.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

// ============================================================================
// Contact Tools
// ============================================================================

server.tool(
	'pylon_list_contacts',
	'List contacts. Returns compact table.',
	{
		limit: z
			.number()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(
				`Number of contacts to return (1-${MAX_LIST_LIMIT}, default ${DEFAULT_LIST_LIMIT})`,
			),
		cursor: z.string().optional().describe('Pagination cursor for next page'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listContacts({
			limit: limit ?? DEFAULT_LIST_LIMIT,
			cursor,
		});

		// Transform to minimal format to reduce context size
		const contacts = result.data.map((raw) =>
			toContactMinimal(raw as unknown as Record<string, unknown>),
		);

		const table = formatContactsAsTable(contacts);
		const pagination = result.pagination.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

server.tool(
	'pylon_get_contact',
	'Get contact details by ID.',
	{
		id: z.string().describe('The contact ID'),
	},
	async ({ id }) => {
		const result = await client.getContact(id);
		// Return minimal fields to reduce context size
		const contact = toContactMinimal(result.data as unknown as Record<string, unknown>);
		return {
			content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }],
		};
	},
);

server.tool(
	'pylon_create_contact',
	'Create a new contact in Pylon',
	{
		name: z.string().describe('The name of the contact'),
		email: z.string().optional().describe('Email address of the contact'),
		account_id: z
			.string()
			.optional()
			.describe('ID of the account to associate with'),
		avatar_url: z.string().optional().describe('URL of the contact avatar'),
		portal_role: z
			.enum(['no_access', 'member', 'admin'])
			.optional()
			.describe('Portal access role'),
	},
	async (params) => {
		const result = await client.createContact(params);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_update_contact',
	'Update an existing contact',
	{
		id: z.string().describe('The contact ID'),
		name: z.string().optional().describe('Updated name'),
		email: z.string().optional().describe('Updated email'),
		account_id: z.string().optional().describe('Updated account association'),
		avatar_url: z.string().optional().describe('Updated avatar URL'),
		portal_role: z
			.enum(['no_access', 'member', 'admin'])
			.optional()
			.describe('Updated portal role'),
	},
	async ({ id, ...data }) => {
		const result = await client.updateContact(id, data);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_delete_contact',
	'Delete a contact',
	{
		id: z.string().describe('The contact ID to delete'),
	},
	async ({ id }) => {
		const result = await client.deleteContact(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

server.tool(
	'pylon_search_contacts',
	'Search contacts with filters. Returns compact table.',
	{
		filter: z
			.object({
				id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe('Filter by contact ID'),
				email: z
					.object({
						equals: z.string().optional(),
						string_contains: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe('Filter by email'),
				account_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
						is_set: z.boolean().optional(),
						is_unset: z.boolean().optional(),
					})
					.optional()
					.describe('Filter by account ID'),
			})
			.describe(
				'Filter object. Each field requires an operator like {email: {string_contains: "@example.com"}}',
			),
		limit: z
			.number()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(
				`Results limit (1-${MAX_LIST_LIMIT}, default ${DEFAULT_LIST_LIMIT})`,
			),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ filter, limit, cursor }) => {
		const result = await client.searchContacts(filter, {
			limit: limit ?? DEFAULT_LIST_LIMIT,
			cursor,
		});

		// Transform to minimal format to reduce context size
		const contacts = (result.data || []).map((raw) =>
			toContactMinimal(raw as unknown as Record<string, unknown>),
		);

		const table = formatContactsAsTable(contacts);
		const pagination = result.pagination?.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

// ============================================================================
// Issue Tools
// ============================================================================

server.tool(
	'pylon_list_issues',
	'List issues within a time range (max 30 days). Returns compact table. Use pylon_get_issue for details.',
	{
		start_time: z
			.string()
			.describe('Start time in RFC3339 format (e.g., 2024-01-01T00:00:00Z)'),
		end_time: z
			.string()
			.describe('End time in RFC3339 format (e.g., 2024-01-31T00:00:00Z)'),
		limit: z
			.number()
			.min(1)
			.max(100)
			.optional()
			.describe(`Number of issues to return (1-100, default ${DEFAULT_ISSUE_LIMIT})`),
		cursor: z.string().optional().describe('Pagination cursor for next page'),
	},
	async ({ start_time, end_time, limit, cursor }) => {
		const result = await client.listIssues(start_time, end_time, {
			limit: limit ?? DEFAULT_ISSUE_LIMIT,
			cursor,
		});

		// Transform to minimal format to reduce context size
		const issues = (result.data || []).map((raw) =>
			toIssueMinimal(raw as unknown as Record<string, unknown>),
		);

		const table = formatIssuesAsTable(issues);
		const pagination = result.pagination?.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

server.tool(
	'pylon_get_issue',
	'Get issue details by ID or number. Returns standard fields (no body). Use pylon_get_issue_body to fetch body content.',
	{
		id: z.string().describe('The issue ID or issue number'),
		include_body: z
			.boolean()
			.optional()
			.describe('Include truncated body preview (500 chars max)'),
	},
	async ({ id, include_body }) => {
		const result = await client.getIssue(id);
		const raw = result.data as unknown as Record<string, unknown>;

		if (include_body) {
			const issue = toIssueFull(raw);
			return {
				content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
			};
		}

		const issue = toIssueStandard(raw);
		return {
			content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
		};
	},
);

server.tool(
	'pylon_get_issue_body',
	'Get the full body content of an issue. Warning: can be very large for email threads.',
	{
		id: z.string().describe('The issue ID or issue number'),
		max_length: z
			.number()
			.min(100)
			.max(10000)
			.optional()
			.describe('Maximum body length to return (default 2000, max 10000)'),
	},
	async ({ id, max_length }) => {
		const result = await client.getIssue(id);
		const raw = result.data as unknown as Record<string, unknown>;
		const bodyHtml = raw['body_html'] as string | null | undefined;

		if (!bodyHtml) {
			return {
				content: [{ type: 'text', text: 'No body content available.' }],
			};
		}

		// Strip HTML and truncate
		const maxLen = max_length ?? 2000;
		const text = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
		const truncated =
			text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;

		return {
			content: [
				{
					type: 'text',
					text: `Issue #${raw['number']} body (${text.length} chars total, showing ${truncated.length}):\n\n${truncated}`,
				},
			],
		};
	},
);

server.tool(
	'pylon_create_issue',
	'Create a new issue/ticket in Pylon',
	{
		title: z.string().describe('Title of the issue'),
		body_html: z.string().describe('HTML content of the issue body'),
		account_id: z.string().optional().describe('Associated account ID'),
		assignee_id: z
			.string()
			.optional()
			.describe('User ID to assign the issue to'),
		contact_id: z.string().optional().describe('Associated contact ID'),
		requester_id: z.string().optional().describe('Requester contact ID'),
		tags: z.array(z.string()).optional().describe('Tags to apply'),
		priority: z
			.enum(['urgent', 'high', 'medium', 'low'])
			.optional()
			.describe('Issue priority'),
	},
	async (params) => {
		const result = await client.createIssue(params);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_update_issue',
	'Update an existing issue',
	{
		id: z.string().describe('The issue ID'),
		state: z
			.string()
			.optional()
			.describe(
				'Issue state: new, waiting_on_you, waiting_on_customer, on_hold, closed, or custom',
			),
		title: z.string().optional().describe('Updated title'),
		tags: z.array(z.string()).optional().describe('Updated tags'),
		assignee_id: z.string().optional().describe('New assignee user ID'),
		team_id: z.string().optional().describe('Team ID to assign to'),
		account_id: z.string().optional().describe('Updated account ID'),
		priority: z
			.enum(['urgent', 'high', 'medium', 'low'])
			.optional()
			.describe('Updated priority'),
		customer_portal_visible: z
			.boolean()
			.optional()
			.describe('Whether visible in customer portal'),
	},
	async ({ id, ...data }) => {
		const result = await client.updateIssue(id, data);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_delete_issue',
	'Delete an issue',
	{
		id: z.string().describe('The issue ID to delete'),
	},
	async ({ id }) => {
		const result = await client.deleteIssue(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

server.tool(
	'pylon_search_issues',
	'Search issues with filters. Returns compact table. Use pylon_get_issue for details.',
	{
		filter: z
			.object({
				created_at: z
					.object({
						time_is_after: z.string().optional(),
						time_is_before: z.string().optional(),
						time_range: z
							.object({ start: z.string(), end: z.string() })
							.optional(),
					})
					.optional()
					.describe('Filter by creation time (RFC3339 format)'),
				account_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
						is_set: z.boolean().optional(),
						is_unset: z.boolean().optional(),
					})
					.optional()
					.describe('Filter by account ID'),
				requester_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
						is_set: z.boolean().optional(),
						is_unset: z.boolean().optional(),
					})
					.optional()
					.describe('Filter by requester ID'),
				state: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe(
						'Filter by state: new, waiting_on_you, waiting_on_customer, on_hold, closed',
					),
				tags: z
					.object({
						contains: z.string().optional(),
						does_not_contain: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe('Filter by tags'),
				title: z
					.object({
						string_contains: z.string().optional(),
						string_does_not_contain: z.string().optional(),
					})
					.optional()
					.describe('Filter by title'),
				assignee_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
						is_set: z.boolean().optional(),
						is_unset: z.boolean().optional(),
					})
					.optional()
					.describe('Filter by assignee ID'),
				team_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
						is_set: z.boolean().optional(),
						is_unset: z.boolean().optional(),
					})
					.optional()
					.describe('Filter by team ID'),
				resolved_at: z
					.object({
						time_is_after: z.string().optional(),
						time_is_before: z.string().optional(),
						time_range: z
							.object({ start: z.string(), end: z.string() })
							.optional(),
					})
					.optional()
					.describe('Filter by resolution time (RFC3339 format)'),
				latest_message_activity_at: z
					.object({
						time_is_after: z.string().optional(),
						time_is_before: z.string().optional(),
						time_range: z
							.object({ start: z.string(), end: z.string() })
							.optional(),
					})
					.optional()
					.describe('Filter by latest message activity time (RFC3339 format)'),
				ticket_form_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
						is_set: z.boolean().optional(),
						is_unset: z.boolean().optional(),
					})
					.optional()
					.describe('Filter by ticket form ID'),
				follower_user_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe('Filter by follower user ID'),
				follower_contact_id: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe('Filter by follower contact ID'),
				issue_type: z
					.object({
						equals: z.string().optional(),
						in: z.array(z.string()).optional(),
						not_in: z.array(z.string()).optional(),
					})
					.optional()
					.describe('Filter by issue type: Conversation or Ticket'),
			})
			.describe(
				'Filter object. Each field requires an operator like {state: {equals: "new"}} or {title: {string_contains: "bug"}}',
			),
		limit: z
			.number()
			.min(1)
			.max(100)
			.optional()
			.describe(`Number of issues to return (1-100, default ${DEFAULT_ISSUE_LIMIT})`),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ filter, limit, cursor }) => {
		const result = await client.searchIssues(filter, {
			limit: limit ?? DEFAULT_ISSUE_LIMIT,
			cursor,
		});

		// Transform to minimal format to reduce context size
		const issues = (result.data || []).map((raw) =>
			toIssueMinimal(raw as unknown as Record<string, unknown>),
		);

		const table = formatIssuesAsTable(issues);
		const pagination = result.pagination?.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

server.tool(
	'pylon_snooze_issue',
	'Snooze an issue until a specific time',
	{
		id: z.string().describe('The issue ID'),
		snooze_until: z.string().describe('Time to snooze until in RFC3339 format'),
	},
	async ({ id, snooze_until }) => {
		const result = await client.snoozeIssue(id, snooze_until);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_get_issue_followers',
	'Get the list of users following an issue',
	{
		id: z.string().describe('The issue ID'),
		limit: z
			.number()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(
				`Number of followers to return (1-${MAX_LIST_LIMIT}, default ${DEFAULT_LIST_LIMIT})`,
			),
		cursor: z.string().optional().describe('Pagination cursor for next page'),
	},
	async ({ id, limit, cursor }) => {
		const result = await client.getIssueFollowers(id, {
			limit: limit ?? DEFAULT_LIST_LIMIT,
			cursor,
		});

		const pagination = result.pagination.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [
				{ type: 'text', text: JSON.stringify(result.data, null, 2) + pagination },
			],
		};
	},
);

server.tool(
	'pylon_update_issue_followers',
	'Add or remove followers from an issue',
	{
		id: z.string().describe('The issue ID'),
		user_ids: z
			.array(z.string())
			.optional()
			.describe('User IDs to add or remove as followers'),
		contact_ids: z
			.array(z.string())
			.optional()
			.describe('Contact IDs to add or remove as followers'),
		operation: z
			.enum(['add', 'remove'])
			.optional()
			.describe('Operation to perform (default: add)'),
	},
	async ({ id, user_ids, contact_ids, operation }) => {
		const result = await client.updateIssueFollowers(id, {
			user_ids,
			contact_ids,
			operation,
		});
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

// ============================================================================
// Message Tools
// ============================================================================

server.tool(
	'pylon_redact_message',
	'Redact a message from an issue',
	{
		issue_id: z.string().describe('The issue ID'),
		message_id: z.string().describe('The message ID to redact'),
	},
	async ({ issue_id, message_id }) => {
		const result = await client.redactMessage(issue_id, message_id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

// ============================================================================
// Tag Tools
// ============================================================================

server.tool(
	'pylon_list_tags',
	'List all tags in Pylon.',
	{
		limit: z
			.number()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(
				`Results limit (1-${MAX_LIST_LIMIT}, default ${DEFAULT_LIST_LIMIT})`,
			),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listTags({
			limit: limit ?? DEFAULT_LIST_LIMIT,
			cursor,
		});

		const table = formatTagsAsTable(
			result.data as unknown as Record<string, unknown>[],
		);
		const pagination = result.pagination.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

server.tool(
	'pylon_get_tag',
	'Get a specific tag by ID',
	{
		id: z.string().describe('The tag ID'),
	},
	async ({ id }) => {
		const result = await client.getTag(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_create_tag',
	'Create a new tag',
	{
		value: z.string().describe('The tag name/value'),
		object_type: z
			.enum(['account', 'issue', 'contact'])
			.describe('Type of object this tag applies to'),
		hex_color: z
			.string()
			.optional()
			.describe('Hex color code for the tag (e.g., #FF5733)'),
	},
	async (params) => {
		const result = await client.createTag(params);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_update_tag',
	'Update an existing tag',
	{
		id: z.string().describe('The tag ID'),
		value: z.string().optional().describe('Updated tag name'),
		hex_color: z.string().optional().describe('Updated hex color'),
	},
	async ({ id, ...data }) => {
		const result = await client.updateTag(id, data);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_delete_tag',
	'Delete a tag',
	{
		id: z.string().describe('The tag ID to delete'),
	},
	async ({ id }) => {
		const result = await client.deleteTag(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

// ============================================================================
// Team Tools
// ============================================================================

server.tool(
	'pylon_list_teams',
	'List all teams in Pylon.',
	{
		limit: z
			.number()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(
				`Results limit (1-${MAX_LIST_LIMIT}, default ${DEFAULT_LIST_LIMIT})`,
			),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listTeams({
			limit: limit ?? DEFAULT_LIST_LIMIT,
			cursor,
		});

		// Transform to minimal format
		const teams = result.data.map((raw) =>
			toTeamMinimal(raw as unknown as Record<string, unknown>),
		);

		const table = formatTeamsAsTable(
			teams as unknown as Record<string, unknown>[],
		);
		const pagination = result.pagination.has_next_page
			? `\n\nMore results available. Use cursor: "${result.pagination.cursor}"`
			: '';

		return {
			content: [{ type: 'text', text: table + pagination }],
		};
	},
);

server.tool(
	'pylon_get_team',
	'Get a specific team by ID',
	{
		id: z.string().describe('The team ID'),
	},
	async ({ id }) => {
		const result = await client.getTeam(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_create_team',
	'Create a new team',
	{
		name: z.string().optional().describe('Team name'),
		user_ids: z
			.array(z.string())
			.optional()
			.describe('User IDs to add to the team'),
	},
	async (params) => {
		const result = await client.createTeam(params);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

server.tool(
	'pylon_update_team',
	'Update an existing team',
	{
		id: z.string().describe('The team ID'),
		name: z.string().optional().describe('Updated team name'),
		user_ids: z
			.array(z.string())
			.optional()
			.describe('Updated list of user IDs'),
	},
	async ({ id, ...data }) => {
		const result = await client.updateTeam(id, data);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
		};
	},
);

// ============================================================================
// Server startup
// ============================================================================

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error('Server error:', error);
	process.exit(1);
});
