import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Checkbox } from '../components/atoms/Checkbox';

const Template: ComponentStory<typeof Checkbox> = (args) => (
	<Checkbox {...args} />
);

export const DefaultCheckbox = Template.bind({});
DefaultCheckbox.args = {};

export const LargeCheckbox = Template.bind({});
LargeCheckbox.args = {
	size: '2',
};

export default {
	title: 'Component/Atoms/Checkbox',
	component: Checkbox,
	parameters: { layout: 'centered' },
	argTypes: {
		checked: { control: 'boolean', default: true },
		size: { control: 'select', options: ['1', '2'] },
		onClick: { action: 'clicked' },
	},
} as ComponentMeta<typeof Checkbox>;
