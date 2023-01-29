import { ClientSafeProvider } from 'next-auth/react';

export enum AuthState {
	login = 'login',
	signup = 'signup',
}

export type AuthData = {
	email: string;
	password: string;
	authType: string;
	redirect?: boolean;
};

export type formError = {
	code: number;
	title: string;
	message: string;
};

export type formResult = {
	error?: string;
	ok: boolean;
	url?: string;
	status: string;
};

export interface IProviders {
	providers: Record<string, ClientSafeProvider>;
}
