import { SignIn as Auth } from '@components/molecules/SignIn';
import { unstable_getServerSession } from 'next-auth/next';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { GetServerSideProps } from 'next';

const SignIn = () => <Auth />;

SignIn.pageTitle = 'Sign In';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
	const session = await unstable_getServerSession(req, res, authOptions);

	return {
		...(session?.user
			? {
					redirect: {
						permanent: false,
						destination: '/',
					},
			  }
			: {}),
		props: {},
	};
};

export default SignIn;
