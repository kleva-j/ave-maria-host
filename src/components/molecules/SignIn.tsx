import { GitHubLogoIcon, InstagramLogoIcon } from '@radix-ui/react-icons';
import { Container } from '@components/atoms/Container';
import { TextField } from '@components/atoms/TextField';
import { Separator } from '@components/atoms/Separator';
import { formError, AuthData } from 'types';
import { useForm, zodResolver } from '@mantine/form';
import { Heading } from '@components/atoms/Heading';
import { Button } from '@components/atoms/Button';
import { Loader } from '@components/atoms/Loader';
import { Label } from '@components/atoms/Label';
import { Flex } from '@components/atoms/Flex';
import { Text } from '@components/atoms/Text';
import { Grid } from '@components/atoms/Grid';
import { SignInErrors } from '@utils/errors';
import { Box } from '@components/atoms/Box';
import { signIn } from 'next-auth/react';
import { styled } from 'stitches.config';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { z } from 'zod';

type formData = Omit<AuthData, 'password'>;

const validate = zodResolver(
	z.object({ email: z.string().email({ message: 'Email is invalid.' }) }),
);

const nextAuthUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL ?? '';

const FlexWrapper = styled(Flex, {
	p: 0,
	border: 'none',
	width: '100%',
	maxWidth: '28rem',

	'@bp1': {
		p: '$6',
		borderRadius: '$3',
		border: '1px solid $slate6',
	},
});

const RpButton = styled(Button, {
	borderRadius: '$2',
	height: '$6',
	px: '$3',
	fontSize: '$3',
	lineHeight: '$sizes$6',

	'@bp1': {
		height: '$7',
		px: '$4',
		fontSize: '$4',
		lineHeight: '$sizes$7',
	},
});

export const SignIn = () => {
	const { error: signInError } = useRouter().query;
	const [loading, setLoading] = useState<boolean>(false);

	const [, setError] = useState<null | formError>(
		signInError
			? {
					title: 'SignIn Error',
					message: SignInErrors[signInError as string] ?? SignInErrors.default,
					code: 403,
			  }
			: null,
	);

	const form = useForm({ initialValues: { email: '' }, validate });

	const handleSubmit =
		(id: string) =>
		(signInOptions = {}) =>
			signIn(id, { callbackUrl: nextAuthUrl, ...signInOptions });

	const handleFormSubmit = async (data: Pick<formData, 'email'>) => {
		setLoading(true);

		const result = await handleSubmit('email')({ ...data, redirect: false });

		console.log(result);

		if (result?.error) {
			setError({
				message: result?.error ?? 'Error sending verification link to mail',
				title: 'Email Verification Error',
				code: result?.status,
			});
		}
		if (!result?.error && result?.ok && result?.status === 200)
			console.log('successfull login');
		setLoading(false);
	};

	return (
		<Container size="1" css={{ height: '100vh' }}>
			<Grid css={{ height: '100%', placeItems: 'center' }}>
				<FlexWrapper direction="column" gap="4">
					<Box>
						<Heading size="3">Hi, Welcome back! 👋</Heading>
						<Text size="3" css={{ my: '$2' }}>
							Sign up / Log in to your account.
						</Text>
					</Box>
					<form onSubmit={form.onSubmit(handleFormSubmit)}>
						<Flex direction="column" gap="3">
							<Box>
								<Label size="3" css={{ mb: '$2' }}>
									Email Address:
								</Label>
								<TextField
									size="3"
									type="email"
									autoComplete="off"
									placeholder="example@email.com"
									{...form.getInputProps('email')}
									{...(form.isDirty('email') && form.errors['email']
										? { state: 'invalid' }
										: {})}
								/>
							</Box>
							<RpButton
								size="md"
								color="teal"
								// type="submit"
								// variant="filled"
								// css={{ width: '100%' }}
							>
								{loading ? (
									<Box>
										<Loader size="3" variant="red" rot1 />
									</Box>
								) : null}
								Login
							</RpButton>

							<Box css={{ position: 'relative', my: '$4' }}>
								<Text
									size="3"
									css={{
										position: 'absolute',
										backgroundColor: '$loContrast',
										mx: 'auto',
										px: '$2',
										left: 'calc(50% - 50px)',
										transform: 'translateY(-45%)',
									}}
								>
									Or Login With
								</Text>
								<Separator size="2" w-full />
							</Box>

							<Flex gap="4">
								<Button
									size="md"
									color="teal"
									variant="outline"
									css={{ p: '$3', height: '$6', width: 'max-content', flex: 1 }}
									onClick={handleSubmit('google')}
								>
									<Box css={{ mr: '$1' }}>
										<InstagramLogoIcon />
									</Box>
									Google
								</Button>

								<Button
									size="md"
									color="teal"
									variant="outline"
									css={{ p: '$3', height: '$6', width: 'max-content', flex: 1 }}
									onClick={handleSubmit('github')}
								>
									<Box css={{ mr: '$1' }}>
										<GitHubLogoIcon />
									</Box>
									Github
								</Button>
							</Flex>
						</Flex>
					</form>
				</FlexWrapper>
			</Grid>
		</Container>
	);
};
