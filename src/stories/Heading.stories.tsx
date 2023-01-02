import React from 'react';
import { Heading } from '../components/atoms/Heading';
import { ComponentStory, ComponentMeta } from '@storybook/react';

const Template: ComponentStory<typeof Heading> = (args) => (
  <Heading {...args} />
);

export const HeadingTemplate = Template.bind({});
HeadingTemplate.args = {
  size: '4',
  gradient: false,
  variant: 'blue',
  children: 'Heading',
};

export default {
  title: 'Component/Atoms/Heading',
  component: Heading,
  argTypes: {
    size: { control: 'select', options: ['1', '2', '3', '4'] },
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
} as ComponentMeta<typeof Heading>;
