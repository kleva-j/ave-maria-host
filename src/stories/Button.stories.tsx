import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Button } from '../components/atoms/Button';

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

export const DefaultButton = Template.bind({});
DefaultButton.args = {
	children: 'Default Button',
};

export const ActiveButton = Template.bind({});
ActiveButton.args = {
	state: 'active',
	children: 'Active Button',
};

export const WaitingButton = Template.bind({});
WaitingButton.args = {
	state: 'waiting',
	children: 'Waiting Button',
};

export const GhostButton = Template.bind({});
GhostButton.args = {
	ghost: true,
	children: 'Ghost Button',
};

export default {
	title: 'Component/Atoms/Button',
	component: Button,
	parameters: { layout: 'centered' },
	argTypes: {
		size: { control: 'select', options: ['1', '2', '3'], defaultValue: '2' },
		state: { control: 'select', options: ['active', 'waiting'] },
		ghost: { control: 'boolean', default: false },
		variant: {
			control: 'select',
			options: [
				'gray',
				'blue',
				'green',
				'red',
				'transparentWhite',
				'transparentBlack',
			],
		},
	},
} as ComponentMeta<typeof Button>;
