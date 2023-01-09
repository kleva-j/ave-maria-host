/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @see https://trpc.io/docs/v10/router
 * @see https://trpc.io/docs/v10/procedures
 * @see https://trpc.io/docs/v10/middlewares
 * @see https://trpc.io/docs/v10/merging-routers
 * @see https://trpc.io/docs/v10/error-formatting
 * @see https://trpc.io/docs/v10/data-transformers
 */

import { Context } from './context';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter: ({ shape }) => shape,
});

// Create a router
export const router = t.router;

// Create an unprotected procedure
export const publicProcedure = t.procedure;

// Create an protected middleware
export const middleware = t.middleware;

export const mergeRouters = t.mergeRouters;

const isAuthed = middleware(({ next, ctx }) => {
	const user = ctx.session?.user;

	if (!user?.name) throw new TRPCError({ code: 'UNAUTHORIZED' });

	return next({
		ctx: {
			user: { ...user, name: user.name },
		},
	});
});

// Protected base procedure
export const authedProcedure = t.procedure.use(isAuthed);
