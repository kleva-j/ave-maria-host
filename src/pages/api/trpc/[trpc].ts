/**
 * This file contains the tRPC http response handler and context creation for Next.js
 */
import * as trpcNext from '@trpc/server/adapters/next';
import { createContext } from 'server/context';
import { AppRouter, appRouter } from 'server/routers/_app';

/**
 * @link https://trpc.io/docs/context
 * @link https://trpc.io/docs/error-handling
 */

export default trpcNext.createNextApiHandler<AppRouter>({
	router: appRouter,
	createContext,
	responseMeta() {
		return {
			headers: {
				'Access-Control-Allow-Origin': `*`,
				'Access-Control-Request-Method': '*',
				'Access-Control-Allow-Methods': 'OPTIONS, GET',
				'Access-Control-Allow-Headers': '*',
			},
			status: 200,
		};
	},
	onError({ error }) {
		if (error.code === 'INTERNAL_SERVER_ERROR') {
			console.error('Something went wrong', error);
		}
	},
	batching: { enabled: true },
});
