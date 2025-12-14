import { describe, expect, it } from 'vitest';

describe('pylon-mcp', () => {
	it('should export the expected module structure', async () => {
		// Basic test to verify the module can be imported
		const { PylonClient } = await import('../src/pylon-client.js');
		expect(PylonClient).toBeDefined();
	});

	it('should create a PylonClient instance', async () => {
		const { PylonClient } = await import('../src/pylon-client.js');
		const client = new PylonClient({ apiToken: 'test-token' });
		expect(client).toBeDefined();
	});
});
