import { styled } from '../../stitches.config';

export const Button = styled('button', {
	// Reset
	all: 'unset',
	alignItems: 'center',
	boxSizing: 'border-box',
	userSelect: 'none',

	cursor: 'pointer',

	'&::before': { boxSizing: 'border-box' },
	'&::after': { boxSizing: 'border-box' },

	// Custom reset?
	display: 'inline-flex',
	flexShrink: 0,
	justifyContent: 'center',
	lineHeight: '1',
	WebkitTapHighlightColor: 'rgba(0,0,0,0)',

	// Custom
	height: '$5',
	px: '$2',
	fontFamily: '$untitled',
	fontSize: '$2',
	fontWeight: 500,
	fontVariantNumeric: 'tabular-nums',

	variants: {
		size: {
			xs: {
				borderRadius: '$1',
				height: '$5',
				px: '$2',
				fontSize: '$1',
				lineHeight: '$sizes$5',
			},
			sm: {
				borderRadius: '$2',
				height: '$6',
				px: '$3',
				fontSize: '$3',
				lineHeight: '$sizes$6',
			},
			md: {
				borderRadius: '$2',
				height: '$7',
				px: '$4',
				fontSize: '$4',
				lineHeight: '$sizes$7',
			},
			lg: {
				borderRadius: '$2',
				height: '$8',
				px: '$5',
				fontSize: '$5',
				lineHeight: '$sizes$8',
			},
		},
		color: {
			sky: { backgroundColor: '$sky9' },
			red: { backgroundColor: '$red9' },
			pink: { backgroundColor: '$pink9' },
			plum: { backgroundColor: '$plum9' },
			blue: { backgroundColor: '$blue9' },
			cyan: { backgroundColor: '$cyan9' },
			teal: { backgroundColor: '$teal9' },
			gold: { backgroundColor: '$gold9' },
			mint: { backgroundColor: '$mint9' },
			lime: { backgroundColor: '$lime9' },
			gray: { backgroundColor: '$gray9' },
			grass: { backgroundColor: '$grass9' },
			amber: { backgroundColor: '$amber9' },
			brown: { backgroundColor: '$brown9' },
			green: { backgroundColor: '$green9' },
			tomato: { backgroundColor: '$tomato9' },
			purple: { backgroundColor: '$purple9' },
			violet: { backgroundColor: '$violet9' },
			indigo: { backgroundColor: '$indigo9' },
			bronze: { backgroundColor: '$bronze9' },
			orange: { backgroundColor: '$orange9' },
			yellow: { backgroundColor: '$yellow9' },
			crimson: { backgroundColor: '$crimson9' },
		},
		variant: {
			light: {},
			filled: {},
			subtle: {
				backgroundColor: 'transparent',
				boxShadow: 'none',
			},
			outline: {
				backgroundColor: 'transparent',
				boxShadow: 'none',
			},
			default: {
				backgroundColor: '$loContrast',
				boxShadow: 'inset 0 0 0 1px $colors$slate7',
				color: '$hiContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 1px $colors$slate8',
					},
				},
				'&:active': {
					backgroundColor: '$slate2',
					boxShadow: 'inset 0 0 0 1px $colors$slate8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$slate8, 0 0 0 1px $colors$slate8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$slate4',
						boxShadow: 'inset 0 0 0 1px $colors$slate8',
					},
			},
			transparentWhite: {
				backgroundColor: 'hsla(0,100%,100%,.2)',
				color: 'white',
				'@hover': {
					'&:hover': {
						backgroundColor: 'hsla(0,100%,100%,.25)',
					},
				},
				'&:active': {
					backgroundColor: 'hsla(0,100%,100%,.3)',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px hsla(0,100%,100%,.35), 0 0 0 1px hsla(0,100%,100%,.35)',
				},
			},
			transparentBlack: {
				backgroundColor: 'hsla(0,0%,0%,.2)',
				color: 'black',
				'@hover': {
					'&:hover': {
						backgroundColor: 'hsla(0,0%,0%,.25)',
					},
				},
				'&:active': {
					backgroundColor: 'hsla(0,0%,0%,.3)',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px hsla(0,0%,0%,.35), 0 0 0 1px hsla(0,0%,0%,.35)',
				},
			},
		},
		compact: { true: { padding: '$1' } },
		disabled: {
			true: {
				'&:disabled': {
					backgroundColor: '$slate2',
					boxShadow: 'inset 0 0 0 1px $colors$slate7',
					color: '$slate8',
					pointerEvents: 'none',
					cursor: 'not-allowed',
				},
			},
		},
		uppercase: { true: { textTransform: 'uppercase' } },
	},
	compoundVariants: [
		{
			color: 'red',
			variant: 'light',
			css: {
				backgroundColor: '$redA3',
				color: '$red9',
				'@hover': {
					'&:hover': { backgroundColor: '$redA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$red4, 0 0 0 1px $colors$red4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$red4',
						boxShadow: 'inset 0 0 0 1px $colors$red4',
					},
			},
		},
		{
			color: 'red',
			variant: 'filled',
			css: {
				backgroundColor: '$red9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$red10',
					},
				},
				'&:active': {
					backgroundColor: '$red8',
					boxShadow: 'inset 0 0 0 0.5px $colors$red8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$red8, 0 0 0 1px $colors$red8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$red10',
						boxShadow: 'inset 0 0 0 1px $colors$red8',
					},
			},
		},
		{
			color: 'red',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$red9',
				'@hover': {
					'&:hover': { backgroundColor: '$red2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$red2, 0 0 0 1px $colors$red2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$red10',
						boxShadow: 'inset 0 0 0 1px $colors$red2',
					},
			},
		},
		{
			color: 'red',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$red9',
				boxShadow: 'inset 0 0 0 1px $colors$red9',
				'@hover': {
					'&:hover': { backgroundColor: '$red1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$red9, 0 0 0 1px $colors$red9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$red10',
						boxShadow: 'inset 0 0 0 1px $colors$red9',
					},
			},
		},
		{
			color: 'blue',
			variant: 'light',
			css: {
				backgroundColor: '$blueA3',
				color: '$blue9',
				'@hover': {
					'&:hover': { backgroundColor: '$blueA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$blue4, 0 0 0 1px $colors$blue4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$blue4',
						boxShadow: 'inset 0 0 0 1px $colors$blue4',
					},
			},
		},
		{
			color: 'blue',
			variant: 'filled',
			css: {
				backgroundColor: '$blue9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$blue10',
					},
				},
				'&:active': {
					backgroundColor: '$blue8',
					boxShadow: 'inset 0 0 0 0.5px $colors$blue8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$blue8, 0 0 0 1px $colors$blue8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$blue10',
						boxShadow: 'inset 0 0 0 1px $colors$blue8',
					},
			},
		},
		{
			color: 'blue',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$blue9',
				'@hover': {
					'&:hover': { backgroundColor: '$blue2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$blue2, 0 0 0 1px $colors$blue2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$blue10',
						boxShadow: 'inset 0 0 0 1px $colors$blue2',
					},
			},
		},
		{
			color: 'blue',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$blue9',
				boxShadow: 'inset 0 0 0 1px $colors$blue9',
				'@hover': {
					'&:hover': { backgroundColor: '$blue1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$blue9, 0 0 0 1px $colors$blue9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$blue10',
						boxShadow: 'inset 0 0 0 1px $colors$blue9',
					},
			},
		},
		{
			color: 'sky',
			variant: 'light',
			css: {
				backgroundColor: '$skyA3',
				color: '$sky9',
				'@hover': {
					'&:hover': { backgroundColor: '$skyA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$sky4, 0 0 0 1px $colors$sky4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$sky4',
						boxShadow: 'inset 0 0 0 1px $colors$sky4',
					},
			},
		},
		{
			color: 'sky',
			variant: 'filled',
			css: {
				backgroundColor: '$sky9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$sky10',
					},
				},
				'&:active': {
					backgroundColor: '$sky8',
					boxShadow: 'inset 0 0 0 0.5px $colors$sky8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$sky8, 0 0 0 1px $colors$sky8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$sky10',
						boxShadow: 'inset 0 0 0 1px $colors$sky8',
					},
			},
		},
		{
			color: 'sky',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$sky9',
				'@hover': {
					'&:hover': { backgroundColor: '$sky2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$sky2, 0 0 0 1px $colors$sky2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$sky10',
						boxShadow: 'inset 0 0 0 1px $colors$sky2',
					},
			},
		},
		{
			color: 'sky',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$sky9',
				boxShadow: 'inset 0 0 0 1px $colors$sky9',
				'@hover': {
					'&:hover': { backgroundColor: '$sky1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$sky9, 0 0 0 1px $colors$sky9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$sky10',
						boxShadow: 'inset 0 0 0 1px $colors$sky9',
					},
			},
		},
		{
			color: 'teal',
			variant: 'light',
			css: {
				backgroundColor: '$tealA3',
				color: '$teal9',
				'@hover': {
					'&:hover': { backgroundColor: '$tealA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$teal4, 0 0 0 1px $colors$teal4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$teal4',
						boxShadow: 'inset 0 0 0 1px $colors$teal4',
					},
			},
		},
		{
			color: 'teal',
			variant: 'filled',
			css: {
				backgroundColor: '$teal9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$teal10',
					},
				},
				'&:active': {
					backgroundColor: '$teal8',
					boxShadow: 'inset 0 0 0 0.5px $colors$teal8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$teal8, 0 0 0 1px $colors$teal8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$teal10',
						boxShadow: 'inset 0 0 0 1px $colors$teal8',
					},
			},
		},
		{
			color: 'teal',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$teal9',
				'@hover': {
					'&:hover': { backgroundColor: '$teal2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$teal2, 0 0 0 1px $colors$teal2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$teal10',
						boxShadow: 'inset 0 0 0 1px $colors$teal2',
					},
			},
		},
		{
			color: 'teal',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$teal9',
				boxShadow: 'inset 0 0 0 1px $colors$teal9',
				'@hover': {
					'&:hover': { backgroundColor: '$teal1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$teal9, 0 0 0 1px $colors$teal9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$teal10',
						boxShadow: 'inset 0 0 0 1px $colors$teal9',
					},
			},
		},
		{
			color: 'plum',
			variant: 'light',
			css: {
				backgroundColor: '$plumA3',
				color: '$plum9',
				'@hover': {
					'&:hover': { backgroundColor: '$plumA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$plum4, 0 0 0 1px $colors$plum4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$plum4',
						boxShadow: 'inset 0 0 0 1px $colors$plum4',
					},
			},
		},
		{
			color: 'plum',
			variant: 'filled',
			css: {
				backgroundColor: '$plum9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$plum10',
					},
				},
				'&:active': {
					backgroundColor: '$plum8',
					boxShadow: 'inset 0 0 0 0.5px $colors$plum8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$plum8, 0 0 0 1px $colors$plum8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$plum10',
						boxShadow: 'inset 0 0 0 1px $colors$plum8',
					},
			},
		},
		{
			color: 'plum',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$plum9',
				'@hover': {
					'&:hover': { backgroundColor: '$plum2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$plum2, 0 0 0 1px $colors$plum2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$plum10',
						boxShadow: 'inset 0 0 0 1px $colors$plum2',
					},
			},
		},
		{
			color: 'plum',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$plum9',
				boxShadow: 'inset 0 0 0 1px $colors$plum9',
				'@hover': {
					'&:hover': { backgroundColor: '$plum1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$plum9, 0 0 0 1px $colors$plum9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$plum10',
						boxShadow: 'inset 0 0 0 1px $colors$plum9',
					},
			},
		},
		{
			color: 'cyan',
			variant: 'light',
			css: {
				backgroundColor: '$cyanA3',
				color: '$cyan9',
				'@hover': {
					'&:hover': { backgroundColor: '$cyanA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$cyan4, 0 0 0 1px $colors$cyan4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$cyan4',
						boxShadow: 'inset 0 0 0 1px $colors$cyan4',
					},
			},
		},
		{
			color: 'cyan',
			variant: 'filled',
			css: {
				backgroundColor: '$cyan9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$cyan10',
					},
				},
				'&:active': {
					backgroundColor: '$cyan8',
					boxShadow: 'inset 0 0 0 0.5px $colors$cyan8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$cyan8, 0 0 0 1px $colors$cyan8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$cyan10',
						boxShadow: 'inset 0 0 0 1px $colors$cyan8',
					},
			},
		},
		{
			color: 'cyan',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$cyan9',
				'@hover': {
					'&:hover': { backgroundColor: '$cyan2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$cyan2, 0 0 0 1px $colors$cyan2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$cyan10',
						boxShadow: 'inset 0 0 0 1px $colors$cyan2',
					},
			},
		},
		{
			color: 'cyan',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$cyan9',
				boxShadow: 'inset 0 0 0 1px $colors$cyan9',
				'@hover': {
					'&:hover': { backgroundColor: '$cyan1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$cyan9, 0 0 0 1px $colors$cyan9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$cyan10',
						boxShadow: 'inset 0 0 0 1px $colors$cyan9',
					},
			},
		},
		{
			color: 'gold',
			variant: 'light',
			css: {
				backgroundColor: '$goldA3',
				color: '$gold9',
				'@hover': {
					'&:hover': { backgroundColor: '$goldA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$gold4, 0 0 0 1px $colors$gold4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$gold4',
						boxShadow: 'inset 0 0 0 1px $colors$gold4',
					},
			},
		},
		{
			color: 'gold',
			variant: 'filled',
			css: {
				backgroundColor: '$gold9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$gold10',
					},
				},
				'&:active': {
					backgroundColor: '$gold8',
					boxShadow: 'inset 0 0 0 0.5px $colors$gold8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$gold8, 0 0 0 1px $colors$gold8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$gold10',
						boxShadow: 'inset 0 0 0 1px $colors$gold8',
					},
			},
		},
		{
			color: 'gold',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$gold9',
				'@hover': {
					'&:hover': { backgroundColor: '$gold2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$gold2, 0 0 0 1px $colors$gold2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$gold10',
						boxShadow: 'inset 0 0 0 1px $colors$gold2',
					},
			},
		},
		{
			color: 'gold',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$gold9',
				boxShadow: 'inset 0 0 0 1px $colors$gold9',
				'@hover': {
					'&:hover': { backgroundColor: '$gold1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$gold9, 0 0 0 1px $colors$gold9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$gold10',
						boxShadow: 'inset 0 0 0 1px $colors$gold9',
					},
			},
		},
		{
			color: 'pink',
			variant: 'light',
			css: {
				backgroundColor: '$pinkA3',
				color: '$pink9',
				'@hover': {
					'&:hover': { backgroundColor: '$pinkA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$pink4, 0 0 0 1px $colors$pink4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$pink4',
						boxShadow: 'inset 0 0 0 1px $colors$pink4',
					},
			},
		},
		{
			color: 'pink',
			variant: 'filled',
			css: {
				backgroundColor: '$pink9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$pink10',
					},
				},
				'&:active': {
					backgroundColor: '$pink8',
					boxShadow: 'inset 0 0 0 0.5px $colors$pink8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$pink8, 0 0 0 1px $colors$pink8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$pink10',
						boxShadow: 'inset 0 0 0 1px $colors$pink8',
					},
			},
		},
		{
			color: 'pink',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$pink9',
				'@hover': {
					'&:hover': { backgroundColor: '$pink2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$pink2, 0 0 0 1px $colors$pink2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$pink10',
						boxShadow: 'inset 0 0 0 1px $colors$pink2',
					},
			},
		},
		{
			color: 'pink',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$pink9',
				boxShadow: 'inset 0 0 0 1px $colors$pink9',
				'@hover': {
					'&:hover': { backgroundColor: '$pink1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$pink9, 0 0 0 1px $colors$pink9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$pink10',
						boxShadow: 'inset 0 0 0 1px $colors$pink9',
					},
			},
		},
		{
			color: 'mint',
			variant: 'light',
			css: {
				backgroundColor: '$mintA3',
				color: '$mint9',
				'@hover': {
					'&:hover': { backgroundColor: '$mintA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$mint4, 0 0 0 1px $colors$mint4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$mint4',
						boxShadow: 'inset 0 0 0 1px $colors$mint4',
					},
			},
		},
		{
			color: 'mint',
			variant: 'filled',
			css: {
				backgroundColor: '$mint9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$mint10',
					},
				},
				'&:active': {
					backgroundColor: '$mint8',
					boxShadow: 'inset 0 0 0 0.5px $colors$mint8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$mint8, 0 0 0 1px $colors$mint8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$mint10',
						boxShadow: 'inset 0 0 0 1px $colors$mint8',
					},
			},
		},
		{
			color: 'mint',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$mint9',
				'@hover': {
					'&:hover': { backgroundColor: '$mint2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$mint2, 0 0 0 1px $colors$mint2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$mint10',
						boxShadow: 'inset 0 0 0 1px $colors$mint2',
					},
			},
		},
		{
			color: 'mint',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$mint9',
				boxShadow: 'inset 0 0 0 1px $colors$mint9',
				'@hover': {
					'&:hover': { backgroundColor: '$mint1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$mint9, 0 0 0 1px $colors$mint9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$mint10',
						boxShadow: 'inset 0 0 0 1px $colors$mint9',
					},
			},
		},
		{
			color: 'lime',
			variant: 'light',
			css: {
				backgroundColor: '$limeA3',
				color: '$lime9',
				'@hover': {
					'&:hover': { backgroundColor: '$limeA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$lime4, 0 0 0 1px $colors$lime4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$lime4',
						boxShadow: 'inset 0 0 0 1px $colors$lime4',
					},
			},
		},
		{
			color: 'lime',
			variant: 'filled',
			css: {
				backgroundColor: '$lime9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$lime10',
					},
				},
				'&:active': {
					backgroundColor: '$lime8',
					boxShadow: 'inset 0 0 0 0.5px $colors$lime8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$lime8, 0 0 0 1px $colors$lime8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$lime10',
						boxShadow: 'inset 0 0 0 1px $colors$lime8',
					},
			},
		},
		{
			color: 'lime',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$lime9',
				'@hover': {
					'&:hover': { backgroundColor: '$lime2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$lime2, 0 0 0 1px $colors$lime2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$lime10',
						boxShadow: 'inset 0 0 0 1px $colors$lime2',
					},
			},
		},
		{
			color: 'lime',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$lime9',
				boxShadow: 'inset 0 0 0 1px $colors$lime9',
				'@hover': {
					'&:hover': { backgroundColor: '$lime1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$lime9, 0 0 0 1px $colors$lime9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$lime10',
						boxShadow: 'inset 0 0 0 1px $colors$lime9',
					},
			},
		},
		{
			color: 'grass',
			variant: 'light',
			css: {
				backgroundColor: '$grassA3',
				color: '$grass9',
				'@hover': {
					'&:hover': { backgroundColor: '$grassA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$grass4, 0 0 0 1px $colors$grass4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$grass4',
						boxShadow: 'inset 0 0 0 1px $colors$grass4',
					},
			},
		},
		{
			color: 'grass',
			variant: 'filled',
			css: {
				backgroundColor: '$grass9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$grass10',
					},
				},
				'&:active': {
					backgroundColor: '$grass8',
					boxShadow: 'inset 0 0 0 0.5px $colors$grass8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$grass8, 0 0 0 1px $colors$grass8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$grass10',
						boxShadow: 'inset 0 0 0 1px $colors$grass8',
					},
			},
		},
		{
			color: 'grass',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$grass9',
				'@hover': {
					'&:hover': { backgroundColor: '$grass2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$grass2, 0 0 0 1px $colors$grass2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$grass10',
						boxShadow: 'inset 0 0 0 1px $colors$grass2',
					},
			},
		},
		{
			color: 'grass',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$grass9',
				boxShadow: 'inset 0 0 0 1px $colors$grass9',
				'@hover': {
					'&:hover': { backgroundColor: '$grass1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$grass9, 0 0 0 1px $colors$grass9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$grass10',
						boxShadow: 'inset 0 0 0 1px $colors$grass9',
					},
			},
		},
		{
			color: 'amber',
			variant: 'light',
			css: {
				backgroundColor: '$amberA3',
				color: '$amber9',
				'@hover': {
					'&:hover': { backgroundColor: '$amberA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$amber4, 0 0 0 1px $colors$amber4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$amber4',
						boxShadow: 'inset 0 0 0 1px $colors$amber4',
					},
			},
		},
		{
			color: 'amber',
			variant: 'filled',
			css: {
				backgroundColor: '$amber9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$amber10',
					},
				},
				'&:active': {
					backgroundColor: '$amber8',
					boxShadow: 'inset 0 0 0 0.5px $colors$amber8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$amber8, 0 0 0 1px $colors$amber8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$amber10',
						boxShadow: 'inset 0 0 0 1px $colors$amber8',
					},
			},
		},
		{
			color: 'amber',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$amber9',
				'@hover': {
					'&:hover': { backgroundColor: '$amber2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$amber2, 0 0 0 1px $colors$amber2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$amber10',
						boxShadow: 'inset 0 0 0 1px $colors$amber2',
					},
			},
		},
		{
			color: 'amber',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$amber9',
				boxShadow: 'inset 0 0 0 1px $colors$amber9',
				'@hover': {
					'&:hover': { backgroundColor: '$amber1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$amber9, 0 0 0 1px $colors$amber9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$amber10',
						boxShadow: 'inset 0 0 0 1px $colors$amber9',
					},
			},
		},
		{
			color: 'brown',
			variant: 'light',
			css: {
				backgroundColor: '$brownA3',
				color: '$brown9',
				'@hover': {
					'&:hover': { backgroundColor: '$brownA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$brown4, 0 0 0 1px $colors$brown4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$brown4',
						boxShadow: 'inset 0 0 0 1px $colors$brown4',
					},
			},
		},
		{
			color: 'brown',
			variant: 'filled',
			css: {
				backgroundColor: '$brown9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$brown10',
					},
				},
				'&:active': {
					backgroundColor: '$brown8',
					boxShadow: 'inset 0 0 0 0.5px $colors$brown8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$brown8, 0 0 0 1px $colors$brown8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$brown10',
						boxShadow: 'inset 0 0 0 1px $colors$brown8',
					},
			},
		},
		{
			color: 'brown',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$brown9',
				'@hover': {
					'&:hover': { backgroundColor: '$brown2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$brown2, 0 0 0 1px $colors$brown2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$brown10',
						boxShadow: 'inset 0 0 0 1px $colors$brown2',
					},
			},
		},
		{
			color: 'brown',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$brown9',
				boxShadow: 'inset 0 0 0 1px $colors$brown9',
				'@hover': {
					'&:hover': { backgroundColor: '$brown1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$brown9, 0 0 0 1px $colors$brown9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$brown10',
						boxShadow: 'inset 0 0 0 1px $colors$brown9',
					},
			},
		},
		{
			color: 'green',
			variant: 'light',
			css: {
				backgroundColor: '$greenA3',
				color: '$green9',
				'@hover': {
					'&:hover': { backgroundColor: '$greenA4' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$green4, 0 0 0 1px $colors$green4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$green4',
						boxShadow: 'inset 0 0 0 1px $colors$green4',
					},
			},
		},
		{
			color: 'green',
			variant: 'filled',
			css: {
				backgroundColor: '$green9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$green10',
					},
				},
				'&:active': {
					backgroundColor: '$green8',
					boxShadow: 'inset 0 0 0 0.5px $colors$green8',
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$green8, 0 0 0 1px $colors$green8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$green10',
						boxShadow: 'inset 0 0 0 1px $colors$green8',
					},
			},
		},
		{
			color: 'green',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$green9',
				'@hover': {
					'&:hover': { backgroundColor: '$green2' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$green2, 0 0 0 1px $colors$green2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$green10',
						boxShadow: 'inset 0 0 0 1px $colors$green2',
					},
			},
		},
		{
			color: 'green',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$green9',
				boxShadow: 'inset 0 0 0 1px $colors$green9',
				'@hover': {
					'&:hover': { backgroundColor: '$green1' },
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$green9, 0 0 0 1px $colors$green9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$green10',
						boxShadow: 'inset 0 0 0 1px $colors$green9',
					},
			},
		},
		{
			color: 'tomato',
			variant: 'light',
			css: {
				backgroundColor: '$tomatoA3',
				color: '$tomato9',
				'@hover': {
					'&:hover': { backgroundColor: '$tomatoA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$tomato4, 0 0 0 1px $colors$tomato4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$tomato4',
						boxShadow: 'inset 0 0 0 1px $colors$tomato4',
					},
			},
		},
		{
			color: 'tomato',
			variant: 'filled',
			css: {
				backgroundColor: '$tomato9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$tomato10',
					},
				},
				'&:active': {
					backgroundColor: '$tomato8',
					boxShadow: 'inset 0 0 0 0.5px $colors$tomato8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$tomato8, 0 0 0 1px $colors$tomato8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$tomato10',
						boxShadow: 'inset 0 0 0 1px $colors$tomato8',
					},
			},
		},
		{
			color: 'tomato',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$tomato9',
				'@hover': {
					'&:hover': { backgroundColor: '$tomato2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$tomato2, 0 0 0 1px $colors$tomato2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$tomato10',
						boxShadow: 'inset 0 0 0 1px $colors$tomato2',
					},
			},
		},
		{
			color: 'tomato',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$tomato9',
				boxShadow: 'inset 0 0 0 1px $colors$tomato9',
				'@hover': {
					'&:hover': { backgroundColor: '$tomato1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$tomato9, 0 0 0 1px $colors$tomato9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$tomato10',
						boxShadow: 'inset 0 0 0 1px $colors$tomato9',
					},
			},
		},
		{
			color: 'purple',
			variant: 'light',
			css: {
				backgroundColor: '$purpleA3',
				color: '$purple9',
				'@hover': {
					'&:hover': { backgroundColor: '$purpleA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$purple4, 0 0 0 1px $colors$purple4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$purple4',
						boxShadow: 'inset 0 0 0 1px $colors$purple4',
					},
			},
		},
		{
			color: 'purple',
			variant: 'filled',
			css: {
				backgroundColor: '$purple9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$purple10',
					},
				},
				'&:active': {
					backgroundColor: '$purple8',
					boxShadow: 'inset 0 0 0 0.5px $colors$purple8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$purple8, 0 0 0 1px $colors$purple8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$purple10',
						boxShadow: 'inset 0 0 0 1px $colors$purple8',
					},
			},
		},
		{
			color: 'purple',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$purple9',
				'@hover': {
					'&:hover': { backgroundColor: '$purple2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$purple2, 0 0 0 1px $colors$purple2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$purple10',
						boxShadow: 'inset 0 0 0 1px $colors$purple2',
					},
			},
		},
		{
			color: 'purple',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$purple9',
				boxShadow: 'inset 0 0 0 1px $colors$purple9',
				'@hover': {
					'&:hover': { backgroundColor: '$purple1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$purple9, 0 0 0 1px $colors$purple9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$purple10',
						boxShadow: 'inset 0 0 0 1px $colors$purple9',
					},
			},
		},
		{
			color: 'violet',
			variant: 'light',
			css: {
				backgroundColor: '$violetA3',
				color: '$violet9',
				'@hover': {
					'&:hover': { backgroundColor: '$violetA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$violet4, 0 0 0 1px $colors$violet4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$violet4',
						boxShadow: 'inset 0 0 0 1px $colors$violet4',
					},
			},
		},
		{
			color: 'violet',
			variant: 'filled',
			css: {
				backgroundColor: '$violet9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$violet10',
					},
				},
				'&:active': {
					backgroundColor: '$violet8',
					boxShadow: 'inset 0 0 0 0.5px $colors$violet8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$violet8, 0 0 0 1px $colors$violet8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$violet10',
						boxShadow: 'inset 0 0 0 1px $colors$violet8',
					},
			},
		},
		{
			color: 'violet',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$violet9',
				'@hover': {
					'&:hover': { backgroundColor: '$violet2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$violet2, 0 0 0 1px $colors$violet2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$violet10',
						boxShadow: 'inset 0 0 0 1px $colors$violet2',
					},
			},
		},
		{
			color: 'violet',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$violet9',
				boxShadow: 'inset 0 0 0 1px $colors$violet9',
				'@hover': {
					'&:hover': { backgroundColor: '$violet1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$violet9, 0 0 0 1px $colors$violet9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$violet10',
						boxShadow: 'inset 0 0 0 1px $colors$violet9',
					},
			},
		},
		{
			color: 'indigo',
			variant: 'light',
			css: {
				backgroundColor: '$indigoA3',
				color: '$indigo9',
				'@hover': {
					'&:hover': { backgroundColor: '$indigoA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$indigo4, 0 0 0 1px $colors$indigo4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$indigo4',
						boxShadow: 'inset 0 0 0 1px $colors$indigo4',
					},
			},
		},
		{
			color: 'indigo',
			variant: 'filled',
			css: {
				backgroundColor: '$indigo9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$indigo10',
					},
				},
				'&:active': {
					backgroundColor: '$indigo8',
					boxShadow: 'inset 0 0 0 0.5px $colors$indigo8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$indigo8, 0 0 0 1px $colors$indigo8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$indigo10',
						boxShadow: 'inset 0 0 0 1px $colors$indigo8',
					},
			},
		},
		{
			color: 'indigo',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$indigo9',
				'@hover': {
					'&:hover': { backgroundColor: '$indigo2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$indigo2, 0 0 0 1px $colors$indigo2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$indigo10',
						boxShadow: 'inset 0 0 0 1px $colors$indigo2',
					},
			},
		},
		{
			color: 'indigo',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$indigo9',
				boxShadow: 'inset 0 0 0 1px $colors$indigo9',
				'@hover': {
					'&:hover': { backgroundColor: '$indigo1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$indigo9, 0 0 0 1px $colors$indigo9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$indigo10',
						boxShadow: 'inset 0 0 0 1px $colors$indigo9',
					},
			},
		},
		{
			color: 'bronze',
			variant: 'light',
			css: {
				backgroundColor: '$bronzeA3',
				color: '$bronze9',
				'@hover': {
					'&:hover': { backgroundColor: '$bronzeA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$bronze4, 0 0 0 1px $colors$bronze4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$bronze4',
						boxShadow: 'inset 0 0 0 1px $colors$bronze4',
					},
			},
		},
		{
			color: 'bronze',
			variant: 'filled',
			css: {
				backgroundColor: '$bronze9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$bronze10',
					},
				},
				'&:active': {
					backgroundColor: '$bronze8',
					boxShadow: 'inset 0 0 0 0.5px $colors$bronze8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$bronze8, 0 0 0 1px $colors$bronze8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$bronze10',
						boxShadow: 'inset 0 0 0 1px $colors$bronze8',
					},
			},
		},
		{
			color: 'bronze',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$bronze9',
				'@hover': {
					'&:hover': { backgroundColor: '$bronze2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$bronze2, 0 0 0 1px $colors$bronze2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$bronze10',
						boxShadow: 'inset 0 0 0 1px $colors$bronze2',
					},
			},
		},
		{
			color: 'bronze',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$bronze9',
				boxShadow: 'inset 0 0 0 1px $colors$bronze9',
				'@hover': {
					'&:hover': { backgroundColor: '$bronze1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$bronze9, 0 0 0 1px $colors$bronze9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$bronze10',
						boxShadow: 'inset 0 0 0 1px $colors$bronze9',
					},
			},
		},
		{
			color: 'orange',
			variant: 'light',
			css: {
				backgroundColor: '$orangeA3',
				color: '$orange9',
				'@hover': {
					'&:hover': { backgroundColor: '$orangeA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$orange4, 0 0 0 1px $colors$orange4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$orange4',
						boxShadow: 'inset 0 0 0 1px $colors$orange4',
					},
			},
		},
		{
			color: 'orange',
			variant: 'filled',
			css: {
				backgroundColor: '$orange9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$orange10',
					},
				},
				'&:active': {
					backgroundColor: '$orange8',
					boxShadow: 'inset 0 0 0 0.5px $colors$orange8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$orange8, 0 0 0 1px $colors$orange8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$orange10',
						boxShadow: 'inset 0 0 0 1px $colors$orange8',
					},
			},
		},
		{
			color: 'orange',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$orange9',
				'@hover': {
					'&:hover': { backgroundColor: '$orange2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$orange2, 0 0 0 1px $colors$orange2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$orange10',
						boxShadow: 'inset 0 0 0 1px $colors$orange2',
					},
			},
		},
		{
			color: 'orange',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$orange9',
				boxShadow: 'inset 0 0 0 1px $colors$orange9',
				'@hover': {
					'&:hover': { backgroundColor: '$orange1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$orange9, 0 0 0 1px $colors$orange9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$orange10',
						boxShadow: 'inset 0 0 0 1px $colors$orange9',
					},
			},
		},
		{
			color: 'yellow',
			variant: 'light',
			css: {
				backgroundColor: '$yellowA3',
				color: '$yellow9',
				'@hover': {
					'&:hover': { backgroundColor: '$yellowA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$yellow4, 0 0 0 1px $colors$yellow4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$yellow4',
						boxShadow: 'inset 0 0 0 1px $colors$yellow4',
					},
			},
		},
		{
			color: 'yellow',
			variant: 'filled',
			css: {
				backgroundColor: '$yellow9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$yellow10',
					},
				},
				'&:active': {
					backgroundColor: '$yellow8',
					boxShadow: 'inset 0 0 0 0.5px $colors$yellow8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$yellow8, 0 0 0 1px $colors$yellow8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$yellow10',
						boxShadow: 'inset 0 0 0 1px $colors$yellow8',
					},
			},
		},
		{
			color: 'yellow',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$yellow9',
				'@hover': {
					'&:hover': { backgroundColor: '$yellow2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$yellow2, 0 0 0 1px $colors$yellow2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$yellow10',
						boxShadow: 'inset 0 0 0 1px $colors$yellow2',
					},
			},
		},
		{
			color: 'yellow',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$yellow9',
				boxShadow: 'inset 0 0 0 1px $colors$yellow9',
				'@hover': {
					'&:hover': { backgroundColor: '$yellow1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$yellow9, 0 0 0 1px $colors$yellow9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$yellow10',
						boxShadow: 'inset 0 0 0 1px $colors$yellow9',
					},
			},
		},
		{
			color: 'crimson',
			variant: 'light',
			css: {
				backgroundColor: '$crimsonA3',
				color: '$crimson9',
				'@hover': {
					'&:hover': { backgroundColor: '$crimsonA4' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$crimson4, 0 0 0 1px $colors$crimson4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$crimson4',
						boxShadow: 'inset 0 0 0 1px $colors$crimson4',
					},
			},
		},
		{
			color: 'crimson',
			variant: 'filled',
			css: {
				backgroundColor: '$crimson9',
				boxShadow: 'inset 0 0 0 0.5px $colors$slate7',
				color: '$loContrast',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 0.5px $colors$slate8',
						backgroundColor: '$crimson10',
					},
				},
				'&:active': {
					backgroundColor: '$crimson8',
					boxShadow: 'inset 0 0 0 0.5px $colors$crimson8',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$crimson8, 0 0 0 1px $colors$crimson8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$crimson10',
						boxShadow: 'inset 0 0 0 1px $colors$crimson8',
					},
			},
		},
		{
			color: 'crimson',
			variant: 'subtle',
			css: {
				backgroundColor: 'transparent',
				color: '$crimson9',
				'@hover': {
					'&:hover': { backgroundColor: '$crimson2' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$crimson2, 0 0 0 1px $colors$crimson2',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$crimson10',
						boxShadow: 'inset 0 0 0 1px $colors$crimson2',
					},
			},
		},
		{
			color: 'crimson',
			variant: 'outline',
			css: {
				backgroundColor: 'transparent',
				color: '$crimson9',
				boxShadow: 'inset 0 0 0 1px $colors$crimson9',
				'@hover': {
					'&:hover': { backgroundColor: '$crimson1' },
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$crimson9, 0 0 0 1px $colors$crimson9',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$crimson10',
						boxShadow: 'inset 0 0 0 1px $colors$crimson9',
					},
			},
		},
		{
			variant: 'default',
			color: 'gray',
			css: {
				backgroundColor: 'transparent',
				color: '$hiContrast',
				'@hover': {
					'&:hover': {
						backgroundColor: '$slateA3',
						boxShadow: 'none',
					},
				},
				'&:active': {
					backgroundColor: '$slateA4',
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$slateA8, 0 0 0 1px $colors$slateA8',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$slateA4',
						boxShadow: 'none',
					},
			},
		},
	],
	defaultVariants: {
		size: 'xs',
		color: 'gray',
		variant: 'filled',
	},
});
