import { AppBar } from '@components/atoms/AppBar';
import { BurgerNav } from '@components/molecules/BurgerNav';

interface NavbarProps {
	handleToggle: () => void;
	opened: boolean;
}

export const Navbar = ({ opened, handleToggle }: NavbarProps) => {
	return (
		<AppBar size="2" color="loContrast" border sticky glass>
			<BurgerNav handleToggle={handleToggle} opened={opened} />
		</AppBar>
	);
};
