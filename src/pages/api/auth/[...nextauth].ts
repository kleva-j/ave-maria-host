import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextAuthOptions } from 'next-auth';

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from 'server/prisma';

import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import NextAuth from 'next-auth';

export const authOptions: NextAuthOptions = {
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
			authorization:
				'https://accounts.google.com/o/oauth2/v2/auth?' +
				new URLSearchParams({
					prompt: 'consent',
					access_type: 'offline',
					response_type: 'code',
				}),
			profile: (profile: any) => {
				return {
					email: profile.email,
					role: 'user',
					name: profile.name ?? profile.login,
					emailVerified: new Date().toISOString(),
					image: profile.picture ?? profile.avatar_url,
					id: profile.id ? profile.id.toString() : profile.sub,
				};
			},
		}),
		EmailProvider({ server: process.env.EMAIL_SERVER ?? '' }),
	],
	secret: process.env.NEXTAUTH_SECRET ?? '',
	adapter: PrismaAdapter(prisma),
};

export default async function Auth(req: NextApiRequest, res: NextApiResponse) {
	return NextAuth(req, res, authOptions);
}
