import React from 'react';

import { CheckIcon } from '@radix-ui/react-icons';
import { useDisclosure } from '@mantine/hooks';

import { VariantProps, CSS } from '../../stitches.config';
import { Badge } from './Badge';
import { Box } from './Box';

type ChipVariants = VariantProps<typeof Badge>;

type ChipProps = ChipVariants & {
	css?: CSS;
	as?: string;
	children: React.ReactNode;
};

export const Chip = React.forwardRef<React.ElementRef<typeof Badge>, ChipProps>(
	(props, forwardedRef) => {
		const { variant, children, ...rest } = props;
		const [checked, handler] = useDisclosure(true);

		return (
			<Badge
				ref={forwardedRef}
				{...rest}
				{...(checked ? { interactive: true } : {})}
				variant={checked ? variant : 'gray'}
				onClick={() => handler.toggle()}
			>
				{checked ? (
					<Box css={{ mr: 4 }}>
						<CheckIcon />
					</Box>
				) : null}
				{children}
			</Badge>
		);
	},
);

Chip.displayName = 'Chip';
