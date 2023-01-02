import React from 'react';
import { Text } from '../components/atoms/Text';
import { ComponentStory, ComponentMeta } from '@storybook/react';

const Template: ComponentStory<typeof Text> = (args) => <Text {...args} />;

export const TextTemplate = Template.bind({});
TextTemplate.args = {
  size: 5,
  gradient: true,
  variant: 'pink',
  children: 'Text',
};

export default {
  title: 'Component/Atoms/Text',
  component: Text,
  argTypes: {
    size: { control: 'select', options: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    variant: {
      control: 'select',
      options: [
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
        'gray',
        'contrast',
      ],
    },
    gradient: { control: 'select', options: [true, false] },
  },
} as ComponentMeta<typeof Text>;
