import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Button } from '../components/atoms/Button';

const Template: ComponentStory<typeof Button> = (args) => (
	<Button {...args}>Button</Button>
);

export const DefaultButton = Template.bind({});
DefaultButton.args = {};

export default {
	title: 'Component/Atoms/Button',
	component: Button,
	parameters: { layout: 'centered' },
	argTypes: {
		size: {
			control: 'select',
			options: ['xs', 'sm', 'md', 'lg', 'xl'],
			defaultValue: 'md',
		},
		state: { control: 'select', options: ['active', 'waiting'] },
		ghost: { control: 'boolean', default: false },
		uppercase: { control: 'boolean', default: false },
		disabled: { control: 'boolean', default: false },
		compact: { control: 'boolean', default: false },
		color: {
			control: 'select',
			options: [
				'sky',
				'red',
				'pink',
				'plum',
				'blue',
				'cyan',
				'teal',
				'gold',
				'mint',
				'lime',
				'gray',
				'grass',
				'amber',
				'brown',
				'green',
				'tomato',
				'purple',
				'violet',
				'indigo',
				'bronze',
				'orange',
				'yellow',
				'crimson',
			],
			defaultValue: 'red',
		},
		variant: {
			control: 'select',
			options: ['light', 'filled', 'subtle', 'outline'],
		},
	},
} as ComponentMeta<typeof Button>;
