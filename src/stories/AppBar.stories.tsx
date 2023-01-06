import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { AppBar } from '../components/atoms/AppBar';

const Template: ComponentStory<typeof AppBar> = (args) => <AppBar {...args} />;

export const DefaultAppBar = Template.bind({});
DefaultAppBar.args = {
	size: '1',
	border: true,
	color: 'plain',
	children: 'This is the Default AppBar',
};

export const GlassAppBar = Template.bind({});
GlassAppBar.args = {
	size: 2,
	glass: true,
	border: true,
	color: 'loContrast',
	children: 'This is a Glass AppBar',
};

export const StickyGlassAppBar = Template.bind({});
StickyGlassAppBar.args = {
	size: 3,
	glass: true,
	sticky: true,
	border: true,
	color: 'accent',
	children: 'This is a Sticky Glass AppBar',
};

export default {
	title: 'Component/Atoms/AppBar',
	component: AppBar,
	parameters: { layout: 'padded' },
	argTypes: {
		size: { control: 'select', options: [1, 2, 3] },
		glass: { control: 'boolean', default: false },
		border: { control: 'boolean', default: false },
		sticky: { control: 'boolean', default: false },
		color: { control: 'select', options: ['loContrast', 'plain', 'accent'] },
	},
} as ComponentMeta<typeof AppBar>;
