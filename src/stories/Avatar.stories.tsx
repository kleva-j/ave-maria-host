import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Avatar } from '../components/atoms/Avatar';

const Template: ComponentStory<typeof Avatar> = (args) => (
	<Avatar alt="Colm Tuite" {...args} />
);

export const DefaultAvatar = Template.bind({});
DefaultAvatar.args = {
	src: 'https://pbs.twimg.com/profile_images/864164353771229187/Catw6Nmh_400x400.jpg',
};

export const SquareShapeAvatar = Template.bind({});
SquareShapeAvatar.args = {
	shape: 'square',
	src: 'https://pbs.twimg.com/profile_images/864164353771229187/Catw6Nmh_400x400.jpg',
};

export const InactiveAvatar = Template.bind({});
InactiveAvatar.args = {
	inactive: true,
	src: 'https://pbs.twimg.com/profile_images/864164353771229187/Catw6Nmh_400x400.jpg',
};

export const InteractiveAvatar = Template.bind({});
InteractiveAvatar.args = {
	interactive: true,
	src: 'https://pbs.twimg.com/profile_images/864164353771229187/Catw6Nmh_400x400.jpg',
};

export const HiContrastAvatar = Template.bind({});
HiContrastAvatar.args = {
	variant: 'hiContrast',
	src: 'https://pbs.twimg.com/profile_images/864164353771229187/Catw6Nmh_400x400.jpg',
};

export const ActiveStatusAvatar = Template.bind({});
ActiveStatusAvatar.args = {
	status: 'green',
	src: 'https://pbs.twimg.com/profile_images/864164353771229187/Catw6Nmh_400x400.jpg',
};

export const FallbackAvatar = Template.bind({});
FallbackAvatar.args = {
	status: 'green',
	fallback: 'M',
};

export default {
	title: 'Component/Atoms/Avatar',
	component: Avatar,
	parameters: { layout: 'centered' },
	argTypes: {
		size: {
			control: 'select',
			options: ['1', '2', '3', '4', '5', '6'],
			defaultValue: '4',
		},
		shape: { control: 'select', options: ['square', 'circle'] },
		inactive: { control: 'boolean', default: false },
		interactive: { control: 'boolean', default: false },
		variant: {
			control: 'select',
			options: [
				'hiContrast',
				'gray',
				'tomato',
				'red',
				'crimson',
				'pink',
				'plum',
				'purple',
				'violet',
				'indigo',
				'blue',
				'cyan',
				'teal',
				'green',
				'grass',
				'brown',
				'bronze',
				'gold',
				'sky',
				'mint',
				'lime',
				'yellow',
				'amber',
				'orange',
			],
		},
	},
} as ComponentMeta<typeof Avatar>;
