import { Link as NavLink } from '@components/atoms/Link';
import { Separator } from '@components/atoms/Separator';
import { Container } from '@components/atoms/Container';
import { Button } from '@components/atoms/Button';
import { Flex } from '@components/atoms/Flex';

import Link from 'next/link';

export const Navbar = () => {
	return (
		<Container size="3" css={{ my: '$2' }}>
			<Flex justify="between">
				<a href="/" className="block text-left">
					<img
						src="https://stitches.hyperyolo.com/images/logo.png"
						className="h-10 sm:h-10 rounded-full"
						alt="logo"
					/>
				</a>
				<Flex align="center" gap="4">
					<Link href="/" passHref legacyBehavior>
						<NavLink variant="subtle">Home</NavLink>
					</Link>
					<Link href="/ws" passHref legacyBehavior>
						<NavLink variant="subtle">WS</NavLink>
					</Link>
					<Link href="/about" passHref legacyBehavior>
						<NavLink variant="subtle">About</NavLink>
					</Link>
					<Link href="/example" passHref legacyBehavior>
						<NavLink variant="subtle">Example</NavLink>
					</Link>
					<Separator orientation="vertical" />
					<NavLink variant="subtle">Log In</NavLink>
					<Button
						size="sm"
						color="teal"
						variant="light"
						css={{ borderRadius: '$1' }}
					>
						Sign Up
					</Button>
				</Flex>
			</Flex>
		</Container>
	);
};
