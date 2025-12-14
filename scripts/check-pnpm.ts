#!/usr/bin/env node

// Check if the user is using pnpm
const userAgent: string = process.env['npm_config_user_agent'] ?? '';

if (!userAgent.includes('pnpm')) {
	console.error(
		'\x1b[31m%s\x1b[0m',
		'╔════════════════════════════════════════════════════════════╗',
	);
	console.error(
		'\x1b[31m%s\x1b[0m',
		'║  ERROR: This project requires pnpm                         ║',
	);
	console.error(
		'\x1b[31m%s\x1b[0m',
		'║                                                            ║',
	);
	console.error(
		'\x1b[31m%s\x1b[0m',
		'║  Please install dependencies using:                       ║',
	);
	console.error(
		'\x1b[31m%s\x1b[0m',
		'║    corepack enable                                         ║',
	);
	console.error(
		'\x1b[31m%s\x1b[0m',
		'║    pnpm install                                            ║',
	);
	console.error(
		'\x1b[31m%s\x1b[0m',
		'╚════════════════════════════════════════════════════════════╝',
	);
	process.exit(1);
}
