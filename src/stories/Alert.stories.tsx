import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Alert } from '../components/atoms/Alert';

const Template: ComponentStory<typeof Alert> = (args) => <Alert {...args} />;

export const DefaultAlert = Template.bind({});
DefaultAlert.args = {
	size: '1',
	children: 'This is the Default Alert',
};

export const SuccessAlert = Template.bind({});
SuccessAlert.args = {
	size: '1',
	variant: 'green',
	children: 'This is the Success Alert',
};

export const ErrorAlert = Template.bind({});
ErrorAlert.args = {
	size: '1',
	variant: 'red',
	children: 'This is the Error Alert',
};

export const InfoAlert = Template.bind({});
InfoAlert.args = {
	size: '1',
	variant: 'blue',
	children: 'This is the Info Alert',
};

export const LoContrastAlerts = Template.bind({});
LoContrastAlerts.args = {
	size: '1',
	variant: 'loContrast',
	children: 'This is the LoContrast Alert',
};

export default {
	title: 'Component/Atoms/Alert',
	component: Alert,
	argTypes: {
		fit: { control: 'boolean', default: true },
		size: { control: 'select', options: ['1'] },
		variant: {
			control: 'select',
			options: ['red', 'blue', 'gray', 'green', 'loContrast'],
		},
	},
} as ComponentMeta<typeof Alert>;

<Alert variant="green">Incorrect password</Alert>;
