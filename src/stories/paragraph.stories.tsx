import React from 'react';
import { Paragraph } from '../components/atoms/Paragraph';
import { ComponentStory, ComponentMeta } from '@storybook/react';

const Template: ComponentStory<typeof Paragraph> = (args) => (
  <Paragraph {...args} />
);

export const ParagraphTemplate = Template.bind({});
ParagraphTemplate.args = {
  size: '1',
  gradient: false,
  variant: 'blue',
  children:
    'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quibusdam reprehenderit expedita sint dolorem veniam laborum dolorum minima odit. Nihil soluta corporis reprehenderit molestias suscipit quos esse repellat sed cumque est.',
};
export default {
  title: 'Component/Atoms/Paragraph',
  component: Paragraph,
  argTypes: {
    size: { control: 'select', options: ['1', '2'] },
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
} as ComponentMeta<typeof Paragraph>;
