import { type NodeHTTPCreateContextFnOptions } from '@trpc/server/adapters/node-http';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type inferAsyncReturnType } from '@trpc/server';

import { getSession } from 'next-auth/react';
import { IncomingMessage } from 'http';
import { prisma } from './prisma';

import ws from 'ws';

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export const createContext = async (
	opts:
		| CreateNextContextOptions
		| NodeHTTPCreateContextFnOptions<IncomingMessage, ws>,
) => {
	const session = await getSession(opts);

	console.log('createContext for', session?.user?.name ?? 'unknown user');

	return { session, prisma };
};

export type Context = inferAsyncReturnType<typeof createContext>;
