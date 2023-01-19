import { ReactNode, ReactElement, isValidElement } from 'react';

import { BurgerNav } from '@components/molecules/BurgerNav';
import { Section } from '@components/atoms/Section';
import { AppBar } from '@components/atoms/AppBar';
import { useDisclosure } from '@mantine/hooks';
import { Flex } from '@components/atoms/Flex';
import { Box } from '@components/atoms/Box';

type ReactText = string | number;

interface SectionProps {
	opened: boolean;
	handleToggle: () => void;
}

interface Props {
	sidebar?: ReactElement<SectionProps> | ReactText | ReactNode;
	navbar?: ReactElement<SectionProps> | ReactText | ReactNode;
	children: ReactElement<any> | ReactText | ReactNode;
}

export const LayoutSection = ({ children, sidebar, navbar }: Props) => {
	const [opened, handlers] = useDisclosure(true);

	const handleToggle = () => handlers.toggle();

	return (
		<Section
			css={{
				py: '$1',
				height: '100vh',
				overflow: 'hidden',
				position: 'relative',
			}}
		>
			<AppBar size="2" color="loContrast" border sticky glass>
				<BurgerNav handleToggle={handleToggle} opened={opened} />
				{isValidElement(navbar) ? navbar : null}
			</AppBar>
			<Flex css={{ px: '$1' }}>
				{isValidElement(sidebar) ? (
					<Section
						css={{
							overflowY: 'auto',
							height: '95vh',
							width: 220,
							pl: '$6',
							py: '$5',
							transition: 'transform 250ms ease-out',
							...(opened
								? {}
								: { position: 'absolute', transform: 'translateX(-100%)' }),
						}}
					>
						{sidebar}
					</Section>
				) : null}
				<Box
					css={{
						overflowY: 'auto',
						height: '95vh',
						width: '100%',
						px: '$3',
						transition: 'All 250ms ease-out',
					}}
				>
					{children}
				</Box>
			</Flex>
		</Section>
	);
};
