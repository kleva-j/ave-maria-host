import { SignIn as Auth } from '@components/molecules/SignIn';
import { unstable_getServerSession } from 'next-auth/next';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getProviders } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { IProviders } from 'types';

const SignIn = ({ providers }: IProviders) => <Auth providers={providers} />;

SignIn.pageTitle = 'Sign In';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
	const session = await unstable_getServerSession(req, res, authOptions);
	const providers = await getProviders();

	return {
		...(session?.user
			? {
					redirect: {
						permanent: false,
						destination: '/',
					},
			  }
			: {}),
		props: { providers },
	};
};

export default SignIn;
