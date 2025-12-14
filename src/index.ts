#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { PylonClient } from './pylon-client.js';

const PYLON_API_TOKEN = process.env['PYLON_API_TOKEN'];

if (!PYLON_API_TOKEN) {
	console.error('Error: PYLON_API_TOKEN environment variable is required');
	process.exit(1);
}

const client = new PylonClient({ apiToken: PYLON_API_TOKEN });

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
	'List all accounts in Pylon with optional pagination',
	{
		limit: z
			.number()
			.min(1)
			.max(1000)
			.optional()
			.describe('Number of accounts to return (1-1000, default 100)'),
		cursor: z.string().optional().describe('Pagination cursor for next page'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listAccounts({ limit, cursor });
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

server.tool(
	'pylon_get_account',
	'Get a specific account by ID',
	{
		id: z.string().describe('The account ID or external ID'),
	},
	async ({ id }) => {
		const result = await client.getAccount(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
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
	'Search accounts with filters',
	{
		filter: z
			.object({
				domains: z.object({}).optional(),
				tags: z.object({}).optional(),
				name: z.object({}).optional(),
				external_ids: z.object({}).optional(),
			})
			.passthrough()
			.describe(
				'Filter object with fields like domains, tags, name. Supports operators: equals, contains, in, not_in, is_set, is_unset',
			),
		limit: z.number().min(1).max(1000).optional().describe('Results limit'),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ filter, limit, cursor }) => {
		const result = await client.searchAccounts(filter, { limit, cursor });
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

// ============================================================================
// Contact Tools
// ============================================================================

server.tool(
	'pylon_list_contacts',
	'List all contacts in Pylon with optional pagination',
	{
		limit: z
			.number()
			.min(1)
			.max(1000)
			.optional()
			.describe('Number of contacts to return (1-1000, default 100)'),
		cursor: z.string().optional().describe('Pagination cursor for next page'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listContacts({ limit, cursor });
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

server.tool(
	'pylon_get_contact',
	'Get a specific contact by ID',
	{
		id: z.string().describe('The contact ID'),
	},
	async ({ id }) => {
		const result = await client.getContact(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
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
	'Search contacts with filters',
	{
		filter: z
			.object({
				id: z.object({}).optional(),
				email: z.object({}).optional(),
				account_id: z.object({}).optional(),
			})
			.passthrough()
			.describe(
				'Filter object with fields like id, email, account_id. Supports operators: equals, in, not_in, string_contains',
			),
		limit: z.number().min(1).max(1000).optional().describe('Results limit'),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ filter, limit, cursor }) => {
		const result = await client.searchContacts(filter, { limit, cursor });
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

// ============================================================================
// Issue Tools
// ============================================================================

server.tool(
	'pylon_list_issues',
	'List issues within a time range (max 30 days)',
	{
		start_time: z
			.string()
			.describe('Start time in RFC3339 format (e.g., 2024-01-01T00:00:00Z)'),
		end_time: z
			.string()
			.describe('End time in RFC3339 format (e.g., 2024-01-31T00:00:00Z)'),
	},
	async ({ start_time, end_time }) => {
		const result = await client.listIssues(start_time, end_time);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

server.tool(
	'pylon_get_issue',
	'Get a specific issue by ID or issue number',
	{
		id: z.string().describe('The issue ID or issue number'),
	},
	async ({ id }) => {
		const result = await client.getIssue(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
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
	'Search issues with filters',
	{
		filter: z
			.object({
				created_at: z.object({}).optional(),
				account_id: z.object({}).optional(),
				requester_id: z.object({}).optional(),
				state: z.object({}).optional(),
				tags: z.object({}).optional(),
				title: z.object({}).optional(),
				assignee_id: z.object({}).optional(),
				team_id: z.object({}).optional(),
				issue_type: z.object({}).optional(),
			})
			.passthrough()
			.describe('Filter object for searching issues'),
		limit: z.number().min(1).max(1000).optional().describe('Results limit'),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ filter, limit, cursor }) => {
		const result = await client.searchIssues(filter, { limit, cursor });
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
	},
	async ({ id }) => {
		const result = await client.getIssueFollowers(id);
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		};
	},
);

server.tool(
	'pylon_update_issue_followers',
	'Add or remove followers from an issue',
	{
		id: z.string().describe('The issue ID'),
		add_user_ids: z
			.array(z.string())
			.optional()
			.describe('User IDs to add as followers'),
		remove_user_ids: z
			.array(z.string())
			.optional()
			.describe('User IDs to remove as followers'),
	},
	async ({ id, add_user_ids, remove_user_ids }) => {
		const result = await client.updateIssueFollowers(id, {
			add_user_ids,
			remove_user_ids,
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
	'List all tags in Pylon',
	{
		limit: z.number().min(1).max(1000).optional().describe('Results limit'),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listTags({ limit, cursor });
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
	'List all teams in Pylon',
	{
		limit: z.number().min(1).max(1000).optional().describe('Results limit'),
		cursor: z.string().optional().describe('Pagination cursor'),
	},
	async ({ limit, cursor }) => {
		const result = await client.listTeams({ limit, cursor });
		return {
			content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
