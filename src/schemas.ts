/**
 * Zod schemas for Pylon API responses.
 * These define minimal response shapes to avoid context overflow in LLM clients.
 *
 * Philosophy:
 * - Default responses contain only essential fields for listing/searching
 * - Use pylon_get_* tools to fetch full details for a specific item
 * - Even "full" responses exclude massive fields like body_html
 * - Body content requires explicit fetch via dedicated tool
 */

import { z } from 'zod';

// ============================================================================
// Pagination
// ============================================================================

export const PaginationSchema = z.object({
	cursor: z.string().nullable(),
	has_next_page: z.boolean(),
});

// ============================================================================
// Issue Schemas
// ============================================================================

/**
 * Minimal issue fields for list/search operations.
 * This is what gets returned by default to avoid context overflow.
 */
export const IssueMinimalSchema = z.object({
	id: z.string(),
	number: z.number().optional(),
	title: z.string(),
	state: z.string(),
	link: z.string().optional(),
	created_at: z.string().optional(),
	assignee_id: z.string().nullable().optional(),
	account_id: z.string().nullable().optional(),
	tags: z.array(z.string()).nullable().optional(),
});

/**
 * Standard issue fields - more detail but still excludes body_html.
 * Use for pylon_get_issue when you need details but not the full body.
 */
export const IssueStandardSchema = IssueMinimalSchema.extend({
	requester_id: z.string().nullable().optional(),
	team_id: z.string().nullable().optional(),
	resolution_time: z.string().nullable().optional(),
	latest_message_time: z.string().nullable().optional(),
	first_response_time: z.string().nullable().optional(),
	customer_portal_visible: z.boolean().optional(),
	source: z.string().optional(),
	type: z.string().optional(),
});

/**
 * Full issue including body - only used when explicitly requested.
 * The body_html is truncated to prevent context overflow.
 */
export const IssueFullSchema = IssueStandardSchema.extend({
	body_html: z.string().nullable().optional(),
});

export type IssueMinimal = z.infer<typeof IssueMinimalSchema>;
export type IssueStandard = z.infer<typeof IssueStandardSchema>;
export type IssueFull = z.infer<typeof IssueFullSchema>;

// ============================================================================
// Account Schemas
// ============================================================================

export const AccountMinimalSchema = z.object({
	id: z.string(),
	name: z.string(),
	primary_domain: z.string().nullable().optional(),
	owner_id: z.string().nullable().optional(),
	tags: z.array(z.string()).nullable().optional(),
});

export const AccountStandardSchema = AccountMinimalSchema.extend({
	domains: z.array(z.string()).nullable().optional(),
	created_at: z.string().optional(),
	type: z.string().optional(),
});

export type AccountMinimal = z.infer<typeof AccountMinimalSchema>;
export type AccountStandard = z.infer<typeof AccountStandardSchema>;

// ============================================================================
// Contact Schemas
// ============================================================================

export const ContactMinimalSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().nullable().optional(),
	account_id: z.string().nullable().optional(),
	portal_role: z.string().nullable().optional(),
});

export const ContactStandardSchema = ContactMinimalSchema.extend({
	emails: z.array(z.string()).nullable().optional(),
	avatar_url: z.string().nullable().optional(),
	created_at: z.string().optional(),
});

export type ContactMinimal = z.infer<typeof ContactMinimalSchema>;
export type ContactStandard = z.infer<typeof ContactStandardSchema>;

// ============================================================================
// Tag Schema
// ============================================================================

export const TagSchema = z.object({
	id: z.string(),
	value: z.string(),
	object_type: z.enum(['account', 'issue', 'contact']),
	hex_color: z.string().nullable().optional(),
});

export type Tag = z.infer<typeof TagSchema>;

// ============================================================================
// Team Schema
// ============================================================================

export const TeamMinimalSchema = z.object({
	id: z.string(),
	name: z.string(),
	member_count: z.number().optional(),
});

export const TeamStandardSchema = TeamMinimalSchema.extend({
	users: z
		.array(
			z.object({
				id: z.string(),
				email: z.string(),
			}),
		)
		.optional(),
});

export type TeamMinimal = z.infer<typeof TeamMinimalSchema>;
export type TeamStandard = z.infer<typeof TeamStandardSchema>;

// ============================================================================
// Transform Functions
// ============================================================================

const MAX_BODY_LENGTH = 500;

/**
 * Strips HTML tags and truncates text for previews.
 */
function stripHtmlAndTruncate(
	html: string | null | undefined,
	maxLength: number,
): string {
	if (!html) return '';
	// Remove HTML tags
	const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Extract account_id from nested account object or direct field.
 */
function extractAccountId(
	issue: Record<string, unknown>,
): string | null | undefined {
	if (typeof issue['account_id'] === 'string') {
		return issue['account_id'];
	}
	const account = issue['account'] as { id?: string } | null | undefined;
	return account?.id;
}

/**
 * Extract assignee_id from nested assignee object or direct field.
 */
function extractAssigneeId(
	issue: Record<string, unknown>,
): string | null | undefined {
	if (typeof issue['assignee_id'] === 'string') {
		return issue['assignee_id'];
	}
	const assignee = issue['assignee'] as { id?: string } | null | undefined;
	return assignee?.id ?? null;
}

/**
 * Extract requester_id from nested requester object or direct field.
 */
function extractRequesterId(
	issue: Record<string, unknown>,
): string | null | undefined {
	if (typeof issue['requester_id'] === 'string') {
		return issue['requester_id'];
	}
	const requester = issue['requester'] as { id?: string } | null | undefined;
	return requester?.id ?? null;
}

/**
 * Extract team_id from nested team object or direct field.
 */
function extractTeamId(
	issue: Record<string, unknown>,
): string | null | undefined {
	if (typeof issue['team_id'] === 'string') {
		return issue['team_id'];
	}
	const team = issue['team'] as { id?: string } | null | undefined;
	return team?.id ?? null;
}

/**
 * Transform a raw issue to minimal format.
 */
export function toIssueMinimal(raw: Record<string, unknown>): IssueMinimal {
	return {
		id: raw['id'] as string,
		number: raw['number'] as number | undefined,
		title: raw['title'] as string,
		state: raw['state'] as string,
		link: raw['link'] as string | undefined,
		created_at: raw['created_at'] as string | undefined,
		assignee_id: extractAssigneeId(raw),
		account_id: extractAccountId(raw),
		tags: raw['tags'] as string[] | null | undefined,
	};
}

/**
 * Transform a raw issue to standard format (more fields, no body).
 */
export function toIssueStandard(raw: Record<string, unknown>): IssueStandard {
	return {
		...toIssueMinimal(raw),
		requester_id: extractRequesterId(raw),
		team_id: extractTeamId(raw),
		resolution_time: raw['resolution_time'] as string | null | undefined,
		latest_message_time: raw['latest_message_time'] as string | null | undefined,
		first_response_time: raw['first_response_time'] as string | null | undefined,
		customer_portal_visible: raw['customer_portal_visible'] as boolean | undefined,
		source: raw['source'] as string | undefined,
		type: raw['type'] as string | undefined,
	};
}

/**
 * Transform a raw issue to full format (includes truncated body).
 */
export function toIssueFull(raw: Record<string, unknown>): IssueFull {
	return {
		...toIssueStandard(raw),
		body_html: stripHtmlAndTruncate(
			raw['body_html'] as string | null | undefined,
			MAX_BODY_LENGTH,
		),
	};
}

/**
 * Transform raw account to minimal format.
 */
export function toAccountMinimal(raw: Record<string, unknown>): AccountMinimal {
	const owner = raw['owner'] as { id?: string } | null | undefined;
	return {
		id: raw['id'] as string,
		name: raw['name'] as string,
		primary_domain: raw['primary_domain'] as string | null | undefined,
		owner_id: owner?.id ?? (raw['owner_id'] as string | null | undefined),
		tags: raw['tags'] as string[] | null | undefined,
	};
}

/**
 * Transform raw account to standard format.
 */
export function toAccountStandard(
	raw: Record<string, unknown>,
): AccountStandard {
	return {
		...toAccountMinimal(raw),
		domains: raw['domains'] as string[] | null | undefined,
		created_at: raw['created_at'] as string | undefined,
		type: raw['type'] as string | undefined,
	};
}

/**
 * Transform raw contact to minimal format.
 */
export function toContactMinimal(raw: Record<string, unknown>): ContactMinimal {
	const account = raw['account'] as { id?: string } | null | undefined;
	return {
		id: raw['id'] as string,
		name: raw['name'] as string,
		email: raw['email'] as string | null | undefined,
		account_id: account?.id ?? (raw['account_id'] as string | null | undefined),
		portal_role: raw['portal_role'] as string | null | undefined,
	};
}

/**
 * Transform raw contact to standard format.
 */
export function toContactStandard(
	raw: Record<string, unknown>,
): ContactStandard {
	return {
		...toContactMinimal(raw),
		emails: raw['emails'] as string[] | null | undefined,
		avatar_url: raw['avatar_url'] as string | null | undefined,
		created_at: raw['created_at'] as string | undefined,
	};
}

/**
 * Transform raw team to minimal format.
 */
export function toTeamMinimal(raw: Record<string, unknown>): TeamMinimal {
	const users = raw['users'] as { id: string; email: string }[] | undefined;
	return {
		id: raw['id'] as string,
		name: raw['name'] as string,
		member_count: users?.length,
	};
}

/**
 * Transform raw team to standard format.
 */
export function toTeamStandard(raw: Record<string, unknown>): TeamStandard {
	return {
		...toTeamMinimal(raw),
		users: raw['users'] as { id: string; email: string }[] | undefined,
	};
}
