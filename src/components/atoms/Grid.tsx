import { styled } from 'stitches.config';

export const Grid = styled('div', {
  boxSizing: 'border-box',
  display: 'grid',

  variants: {
    align: {
      baseline: { alignItems: 'baseline' },
      stretch: { alignItems: 'stretch' },
      center: { alignItems: 'center' },
      start: { alignItems: 'start' },
      end: { alignItems: 'end' },
    },
    justify: {
      between: { justifyContent: 'space-between' },
      center: { justifyContent: 'center' },
      start: { justifyContent: 'start' },
      end: { justifyContent: 'end' },
    },
    flow: {
      columnDense: { gridAutoFlow: 'column dense' },
      rowDense: { gridAutoFlow: 'row dense' },
      column: { gridAutoFlow: 'column' },
      dense: { gridAutoFlow: 'dense' },
      row: { gridAutoFlow: 'row' },
    },
    columns: {
      1: { gridTemplateColumns: 'repeat(1, 1fr)' },
      2: { gridTemplateColumns: 'repeat(2, 1fr)' },
      3: { gridTemplateColumns: 'repeat(3, 1fr)' },
      4: { gridTemplateColumns: 'repeat(4, 1fr)' },
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
    gapX: {
      1: { columnGap: '$1' },
      2: { columnGap: '$2' },
      3: { columnGap: '$3' },
      4: { columnGap: '$4' },
      5: { columnGap: '$5' },
      6: { columnGap: '$6' },
      7: { columnGap: '$7' },
      8: { columnGap: '$8' },
      9: { columnGap: '$9' },
    },
    gapY: {
      1: { rowGap: '$1' },
      2: { rowGap: '$2' },
      3: { rowGap: '$3' },
      4: { rowGap: '$4' },
      5: { rowGap: '$5' },
      6: { rowGap: '$6' },
      7: { rowGap: '$7' },
      8: { rowGap: '$8' },
      9: { rowGap: '$9' },
    },
  },
});
