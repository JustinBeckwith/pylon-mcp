import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IssueSearchFilterSchema } from '../src/issue-search-filter.js';
import { PylonClient } from '../src/pylon-client.js';

const client = new PylonClient({ apiToken: 'test-token' });
const fetchMock = vi.fn();

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock);
	fetchMock.mockResolvedValue({
		ok: true,
		json: async () => ({
			data: [],
			pagination: { has_next_page: false, cursor: null },
		}),
	});
});
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
});

function sentBody() {
	return JSON.parse(fetchMock.mock.calls[0]?.[1].body);
}

describe('issue search wire format', () => {
	it.each([
		[
			{ state: { equals: 'waiting_on_you' } },
			{ field: 'state', operator: 'equals', value: 'waiting_on_you' },
		],
		[
			{ title: { string_contains: 'example' } },
			{ field: 'title', operator: 'string_contains', value: 'example' },
		],
		[
			{ created_at: { time_is_after: '2026-01-23T20:00:00Z' } },
			{
				field: 'created_at',
				operator: 'time_is_after',
				value: '2026-01-23T20:00:00Z',
			},
		],
		[
			{ state: { not_in: ['closed'] } },
			{ field: 'state', operator: 'not_in', values: ['closed'] },
		],
		[
			{
				created_at: {
					time_range: {
						start: '2026-01-01T00:00:00Z',
						end: '2026-01-20T00:00:00Z',
					},
				},
			},
			{
				field: 'created_at',
				operator: 'time_range',
				values: ['2026-01-01T00:00:00Z', '2026-01-20T00:00:00Z'],
			},
		],
	])('serializes %j', async (filter, expected) => {
		await client.searchIssues(filter, { limit: 25, cursor: 'next-page' });
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.usepylon.com/issues/search',
			expect.objectContaining({ method: 'POST' }),
		);
		expect(sentBody()).toEqual({
			filter: expected,
			limit: 25,
			cursor: 'next-page',
		});
	});

	it('combines fields and multiple operators with AND', async () => {
		await client.searchIssues({
			assignee_id: { equals: 'user-uuid' },
			state: { in: ['new', 'waiting_on_you', 'on_hold'], not_in: ['closed'] },
		});
		expect(sentBody().filter).toEqual({
			operator: 'and',
			subfilters: [
				{
					field: 'state',
					operator: 'in',
					values: ['new', 'waiting_on_you', 'on_hold'],
				},
				{ field: 'state', operator: 'not_in', values: ['closed'] },
				{ field: 'assignee_id', operator: 'equals', value: 'user-uuid' },
			],
		});
	});

	it.each([
		['is_set', true, 'is_set'],
		['is_set', false, 'is_unset'],
		['is_unset', true, 'is_unset'],
		['is_unset', false, 'is_set'],
	])('serializes %s=%s without a value', async (operator, value, expected) => {
		await client.searchIssues({ assignee_id: { [operator as string]: value } });
		expect(sentBody().filter).toEqual({
			field: 'assignee_id',
			operator: expected,
		});
	});
});

describe('issue search validation', () => {
	it.each([
		[{}, 'filter'],
		[{ state: {} }, 'state'],
		[{ state: { equals: 'new', gte: 'closed' } }, 'gte'],
		[{ bogus: { equals: 'new' } }, 'bogus'],
		[{ state: { in: [] } }, 'state'],
		[{ state: { equals: null } }, 'state'],
		[{ created_at: { time_range: { start: '2026-01-01T00:00:00Z' } } }, 'end'],
	])('rejects %j before making a request', async (filter, message) => {
		expect(IssueSearchFilterSchema.safeParse(filter).success).toBe(false);
		await expect(client.searchIssues(filter)).rejects.toThrow(message);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('preserves time-range validation', async () => {
		await expect(
			client.searchIssues({
				created_at: {
					time_range: {
						start: '2026-01-01T00:00:00Z',
						end: '2026-03-01T00:00:00Z',
					},
				},
			}),
		).rejects.toThrow('Invalid time_range for created_at');
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
