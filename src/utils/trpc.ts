import { httpBatchLink } from '@trpc/client/links/httpBatchLink';
import { loggerLink } from '@trpc/client/links/loggerLink';
import { wsLink, createWSClient } from '@trpc/client/links/wsLink';
import { createTRPCNext } from '@trpc/next';
import type { inferProcedureOutput } from '@trpc/server';
import { NextPageContext } from 'next';
import getConfig from 'next/config';
import type { AppRouter } from 'server/routers/_app';
import superjson from 'superjson';

const { publicRuntimeConfig } = getConfig();

const { APP_URL, WS_URL } = publicRuntimeConfig;

function getEndingLink(ctx: NextPageContext | undefined) {
	if (typeof window === 'undefined')
		return httpBatchLink({
			url: `${APP_URL}/api/trpc`,
			headers: () => (ctx?.req ? { ...ctx.req.headers, 'x-ssr': '1' } : {}),
		});
	const client = createWSClient({ url: WS_URL });
	return wsLink<AppRouter>({ client });
}

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createReactQueryHooks`.
 *
 *  IMPORTANT LINKS
 * @link https://react-query.tanstack.com/reference/QueryClient
 * @link https://trpc.io/docs/react#3-create-trpc-hooks
 * @link https://trpc.io/docs/data-transformers
 * @link https://trpc.io/docs/links
 * @link https://trpc.io/docs/ssr
 */
export const trpc = createTRPCNext<AppRouter>({
	config({ ctx }) {
		return {
			links: [
				loggerLink({
					enabled: (opts) =>
						(process.env.NODE_ENV === 'development' &&
							typeof window !== 'undefined') ||
						(opts.direction === 'down' && opts.result instanceof Error),
				}),
				getEndingLink(ctx),
			],
			transformer: superjson,
			queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
		};
	},
	ssr: true,
});

// export const transformer = superjson;
/**
 * This is a helper method to infer the output of a query resolver
 * @example type HelloOutput = inferQueryOutput<'hello'>
 */
export type inferQueryOutput<
	TRouteKey extends keyof AppRouter['_def']['queries'],
> = inferProcedureOutput<AppRouter['_def']['queries'][TRouteKey]>;
