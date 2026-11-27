import { z } from 'zod';

function hasCondition(value: object): boolean {
	return Object.values(value).some((entry) => entry !== undefined);
}

export const IssueSearchFilterSchema = z
	.strictObject({
		created_at: z
			.strictObject({
				time_is_after: z.string().optional(),
				time_is_before: z.string().optional(),
				time_range: z
					.strictObject({ start: z.string(), end: z.string() })
					.optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by creation time (RFC3339 format)'),
		account_id: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
				is_set: z.boolean().optional(),
				is_unset: z.boolean().optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by account ID'),
		requester_id: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
				is_set: z.boolean().optional(),
				is_unset: z.boolean().optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by requester ID'),
		state: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe(
				'Filter by state: new, waiting_on_you, waiting_on_customer, on_hold, closed',
			),
		tags: z
			.strictObject({
				contains: z.string().optional(),
				does_not_contain: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by tags'),
		title: z
			.strictObject({
				string_contains: z.string().optional(),
				string_does_not_contain: z.string().optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by title'),
		assignee_id: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
				is_set: z.boolean().optional(),
				is_unset: z.boolean().optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by assignee ID'),
		team_id: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
				is_set: z.boolean().optional(),
				is_unset: z.boolean().optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by team ID'),
		resolved_at: z
			.strictObject({
				time_is_after: z.string().optional(),
				time_is_before: z.string().optional(),
				time_range: z
					.strictObject({ start: z.string(), end: z.string() })
					.optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by resolution time (RFC3339 format)'),
		latest_message_activity_at: z
			.strictObject({
				time_is_after: z.string().optional(),
				time_is_before: z.string().optional(),
				time_range: z
					.strictObject({ start: z.string(), end: z.string() })
					.optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by latest message activity time (RFC3339 format)'),
		ticket_form_id: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
				is_set: z.boolean().optional(),
				is_unset: z.boolean().optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by ticket form ID'),
		follower_user_id: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by follower user ID'),
		follower_contact_id: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by follower contact ID'),
		issue_type: z
			.strictObject({
				equals: z.string().optional(),
				in: z.array(z.string()).min(1).optional(),
				not_in: z.array(z.string()).min(1).optional(),
			})
			.refine(hasCondition, 'Provide at least one filter operator')
			.optional()
			.describe('Filter by issue type: Conversation or Ticket'),
	})
	.refine(hasCondition, 'Provide at least one filter field')
	.describe(
		'Non-empty filter object. All fields and operators are combined with AND. Each field requires an operator like {state: {equals: "new"}} or {title: {string_contains: "bug"}}',
	);
