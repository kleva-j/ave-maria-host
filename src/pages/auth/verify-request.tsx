import { useInterval, useMediaQuery, useTimeout } from '@mantine/hooks';
import { Heading } from '@components/atoms/Heading';
import { Button } from '@components/atoms/Button';
import { Text } from '@components/atoms/Text';
import { Flex } from '@components/atoms/Flex';
import { Card } from '@components/atoms/Card';
import { GetServerSideProps } from 'next';
import { signIn } from 'next-auth/react';
import { AuthState } from 'types';
import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

// import img from '../../../public/images/mailbox.png';

const VerifyRequest = ({ email }: any) => {
	const [seconds, setSeconds] = useState(60);
	const [, setLoading] = useState(false);
	const [touched, setTouched] = useState(false);
	const timeout = useTimeout(() => {
		setTouched(false);
		interval.stop();
		setSeconds(60);
	}, 60000);
	const interval = useInterval(() => setSeconds((s) => s - 1), 1000);

	const handleResendEmail = async () => {
		setLoading(true);
		const { ok }: any = await signIn('email', {
			email,
			redirect: false,
			authType: AuthState.login,
		});
		if (!ok) console.log('Notification sent');
		setLoading(false);
		setTouched(true);
		timeout.start();
		interval.start();
	};

	const matches = useMediaQuery('(min-width: 456px)', true);

	return (
		<Card
		// py="$2"
		// radius="md"
		// px="md"
		// style={{ width: '100%', maxWidth: '700px' }}
		// mx="md"
		>
			<Flex align="center" justify="center">
				<Flex direction="column">
					{matches ? (
						<Heading size="3">Verify your email address</Heading>
					) : (
						<Heading size="4">Verify your email address</Heading>
					)}
					<Text size="2">
						You will need to verify your email to complete registration.
					</Text>
					<Image
						src="/images/mailbox.png"
						priority
						style={{ maxWidth: '70%', height: 'auto', margin: 'auto' }}
						alt="Verify your email address"
					/>
					<Text size="2" css={{ maxWidth: '600px', margin: 'auto' }}>
						An email has been sent to
						<Text css={{ display: 'inline', fontWeight: 600 }}>{email}</Text>
						with a link to verify your account. If you have not received the
						email after a few minutes, please check your spam folder.
					</Text>

					<Flex justify="center" css={{ margin: 'auto', my: '5rem' }}>
						<Button
							onClick={handleResendEmail}
							disabled={touched ? true : false}
							// loading={loading}
						>
							{touched ? `Wait (${seconds}) seconds` : 'Resend Email'}
						</Button>
						<Link href={`/`} passHref>
							<Button as="a" variant="subtle">
								Back to Homepage
							</Button>
						</Link>
					</Flex>
				</Flex>
			</Flex>
		</Card>
	);
};

VerifyRequest.pageTitle = 'Verify Email';

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
	const { provider = 'email', type = 'email', email } = query;
	return {
		...(!email
			? {
					redirect: {
						permanent: true,
						destination: '/',
					},
			  }
			: {}),
		props: { provider, type, email },
	};
};

export default VerifyRequest;
