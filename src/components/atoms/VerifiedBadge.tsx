import React from 'react';

import { CheckIcon } from '@radix-ui/react-icons';

import { styled, CSS } from '../../stitches.config';
import { Flex } from './Flex';

const StyledVerifiedBadge = styled('div', Flex, {
	alignItems: 'center',
	backgroundColor: '$blue9',
	borderRadius: '$round',
	color: 'white',
	flexShrink: 0,
	justifyContent: 'center',
	width: '$3',
	height: '$3',
});

type VerifiedBadgeProps = React.ComponentProps<typeof StyledVerifiedBadge> & {
	css?: CSS;
};

export const VerifiedBadge = React.forwardRef<
	React.ElementRef<typeof StyledVerifiedBadge>,
	VerifiedBadgeProps
>((props, forwardedRef) => (
	<StyledVerifiedBadge {...props} ref={forwardedRef}>
		<CheckIcon />
	</StyledVerifiedBadge>
));

VerifiedBadge.displayName = 'VerifiedBadge';
