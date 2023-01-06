import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Avatar, AvatarGroup } from '../components/atoms/Avatar';

const Template: ComponentStory<typeof Avatar> = (args) => (
	<AvatarGroup css={{ gap: '$2', mb: '$2' }}>
		{[6, 5, 4, 3, 2, 1].map((size) => (
			<Avatar
				key={`two${size}`}
				size={size}
				alt="Colm Tuite"
				src="https://pbs.twimg.com/profile_images/864164353771229187/Catw6Nmh_400x400.jpg"
				{...args}
			/>
		))}
	</AvatarGroup>
);

export const DefaultAvatarGroup = Template.bind({});
DefaultAvatarGroup.args = {};

export default {
	title: 'Component/Atoms/AvatarGroup',
	component: Avatar,
	parameters: { layout: 'centered' },
	argTypes: {
		size: { control: 'select', options: ['1', '2', '3', '4', '5', '6'] },
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
