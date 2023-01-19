import {
	DoubleArrowRightIcon,
	DoubleArrowLeftIcon,
} from '@radix-ui/react-icons';

import { IconButton } from '../atoms/IconButton';

interface Props {
	opened: boolean;
	handleToggle: () => void;
}

export const BurgerNav = ({ opened, handleToggle }: Props) => {
	return (
		<IconButton css={{ ml: '$2' }} onClick={handleToggle}>
			{opened ? (
				<DoubleArrowLeftIcon className="hover:animate-spin" />
			) : (
				<DoubleArrowRightIcon className="hover:animate-spin" />
			)}
		</IconButton>
	);
};
