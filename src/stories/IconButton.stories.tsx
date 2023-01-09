import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Cross2Icon } from '@radix-ui/react-icons';

import { IconButton } from '../components/atoms/IconButton';

const Template: ComponentStory<typeof IconButton> = (args) => (
	<IconButton {...args}>
		<Cross2Icon />
	</IconButton>
);

export const DefaultIconButton = Template.bind({});
DefaultIconButton.args = {};

export const GhostIconButton = Template.bind({});
GhostIconButton.args = {
	variant: 'ghost',
};

export const RaisedIconButton = Template.bind({});
RaisedIconButton.args = {
	variant: 'raised',
};

export const ActiveIconButton = Template.bind({});
ActiveIconButton.args = {
	state: 'active',
};

export const WaitingIconButtons = Template.bind({});
WaitingIconButtons.args = {
	state: 'waiting',
};

export default {
	title: 'Component/Atoms/IconButton',
	component: IconButton,
	parameters: { layout: 'centered' },
	argTypes: {
		rounded: { control: 'boolean', defaultValue: 'false' },
		size: { control: 'select', options: ['1', '2', '3', '4'] },
		state: { control: 'radio', options: ['waiting', 'active'] },
		variant: {
			control: 'radio',
			options: [
				'ghost',
				'raised',
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
			defaultValue: 'ghost',
		},
	},
} as ComponentMeta<typeof IconButton>;
