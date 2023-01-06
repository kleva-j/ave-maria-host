import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Badge } from '../components/atoms/Badge';

const Template: ComponentStory<typeof Badge> = (args) => <Badge {...args} />;

export const DefaultBadge = Template.bind({});
DefaultBadge.args = {
	children: 'Default Badge',
};

export const InteractiveBadge = Template.bind({});
InteractiveBadge.args = {
	children: 'Interactive Badge',
	interactive: true,
};

export default {
	title: 'Component/Atoms/Badge',
	component: Badge,
	parameters: { layout: 'centered' },
	argTypes: {
		size: { control: 'select', options: ['1', '2'], defaultValue: '2' },
		inactive: { control: 'boolean', default: false },
		interactive: { control: 'boolean', default: false },
		variant: {
			control: 'select',
			options: [
				'gray',
				'red',
				'crimson',
				'pink',
				'purple',
				'violet',
				'indigo',
				'blue',
				'cyan',
				'teal',
				'green',
				'lime',
				'yellow',
				'orange',
				'gold',
				'bronze',
			],
		},
	},
} as ComponentMeta<typeof Badge>;
