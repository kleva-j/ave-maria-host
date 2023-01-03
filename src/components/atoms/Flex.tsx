import { styled } from 'stitches.config';

export const Flex = styled('div', {
  boxSizing: 'border-box',
  display: 'flex',

  variants: {
    direction: {
      columnReverse: { flexDirection: 'column-reverse' },
      rowReverse: { flexDirection: 'row-reverse' },
      column: { flexDirection: 'column' },
      row: { flexDirection: 'row' },
    },
    align: {
      baseline: { alignItems: 'baseline' },
      start: { alignItems: 'flex-start' },
      stretch: { alignItems: 'stretch' },
      center: { alignItems: 'center' },
      end: { alignItems: 'flex-end' },
    },
    justify: {
      between: { justifyContent: 'space-between' },
      start: { justifyContent: 'flex-start' },
      center: { justifyContent: 'center' },
      end: { justifyContent: 'flex-end' },
    },
    wrap: {
      wrapReverse: { flexWrap: 'wrap-reverse' },
      noWrap: { flexWrap: 'nowrap' },
      wrap: { flexWrap: 'wrap' },
    },
    gap: {
      1: { gap: '$1' },
      2: { gap: '$2' },
      3: { gap: '$3' },
      4: { gap: '$4' },
      5: { gap: '$5' },
      6: { gap: '$6' },
      7: { gap: '$7' },
      8: { gap: '$8' },
      9: { gap: '$9' },
    },
  },
  defaultVariants: {
    direction: 'row',
    align: 'stretch',
    justify: 'start',
    wrap: 'noWrap',
  },
});
