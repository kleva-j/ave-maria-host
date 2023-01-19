import { Button } from 'components/atoms/Button';
import { useState, useEffect } from 'react';

import { darkTheme } from '../../stitches.config';

export function DarkThemeButton() {
	const [theme, setTheme] = useState('theme-default');

	useEffect(() => {
		document.body.classList.remove('theme-default', darkTheme);
		document.body.classList.add(theme);
	}, [theme]);

	return (
		<Button
			variant="outline"
			color="brown"
			css={{ color: '$hiContrast', background: '$loContrast' }}
			style={{ position: 'fixed', zIndex: 999, right: 15, top: 15 }}
			onClick={() =>
				setTheme(theme === 'theme-default' ? darkTheme : 'theme-default')
			}
		>
			Toggle theme
		</Button>
	);
}
