import { styled } from '../../stitches.config';

export const IconButton = styled('button', {
	// Reset
	alignItems: 'center',
	appearance: 'none',
	borderWidth: '0',
	boxSizing: 'border-box',
	display: 'inline-flex',
	flexShrink: 0,
	fontFamily: 'inherit',
	fontSize: '14px',
	justifyContent: 'center',
	lineHeight: '1',
	outline: 'none',
	padding: '0',
	textDecoration: 'none',
	userSelect: 'none',
	WebkitTapHighlightColor: 'transparent',
	color: '$hiContrast',

	'&::before': { boxSizing: 'border-box' },
	'&::after': { boxSizing: 'border-box' },

	backgroundColor: '$loContrast',
	// border: '1px solid $slate7',
	'@hover': {
		'&:hover': {
			borderColor: '$slate8',
		},
	},
	'&:active': { backgroundColor: '$slate2' },
	'&:focus': {
		borderColor: '$slate8',
		boxShadow: '0 0 0 1px $colors$slate8',
	},
	'&:disabled': {
		pointerEvents: 'none',
		backgroundColor: 'transparent',
		color: '$slate6',
	},

	variants: {
		size: {
			'1': { borderRadius: '$1', height: '$5', width: '$5' },
			'2': { borderRadius: '$2', height: '$6', width: '$6' },
			'3': { borderRadius: '$2', height: '$7', width: '$7' },
			'4': { borderRadius: '$3', height: '$8', width: '$8' },
		},
		variant: {
			ghost: {
				backgroundColor: 'transparent',
				border: '1px solid $slate7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$slateA3',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$slateA8, 0 0 0 1px $colors$slateA8',
				},
				'&:active': {
					backgroundColor: '$slateA4',
				},
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$slateA4',
					},
			},
			raised: {
				border: '1px solid $slate7',
				boxShadow:
					'0 0 transparent, 0 16px 32px hsl(206deg 12% 5% / 25%), 0 3px 5px hsl(0deg 0% 0% / 10%)',
				'@hover': {
					'&:hover': {
						boxShadow:
							'0 0 transparent, 0 16px 32px hsl(206deg 12% 5% / 25%), 0 3px 5px hsl(0deg 0% 0% / 10%)',
					},
				},
				'&:focus': {
					borderColor: '$slate8',
					boxShadow:
						'0 0 0 1px $colors$slate8, 0 16px 32px hsl(206deg 12% 5% / 25%), 0 3px 5px hsl(0deg 0% 0% / 10%)',
				},
				'&:active': {
					backgroundColor: '$slate4',
				},
			},
			sky: {
				backgroundColor: '$sky5',
				border: '1px solid $sky7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$skyA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$skyA8, 0 0 0 1px $colors$skyA8',
				},
				'&:active': { backgroundColor: '$skyA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$skyA4',
					},
			},
			red: {
				backgroundColor: '$red5',
				border: '1px solid $red7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$redA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$redA8, 0 0 0 1px $colors$redA8',
				},
				'&:active': { backgroundColor: '$redA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$redA4',
					},
			},
			pink: {
				backgroundColor: '$pink5',
				border: '1px solid $pink7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$pinkA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$pinkA8, 0 0 0 1px $colors$pinkA8',
				},
				'&:active': { backgroundColor: '$pinkA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$pinkA4',
					},
			},
			plum: {
				backgroundColor: '$plum5',
				border: '1px solid $plum7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$plumA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$plumA8, 0 0 0 1px $colors$plumA8',
				},
				'&:active': { backgroundColor: '$plumA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$plumA4',
					},
			},
			blue: {
				backgroundColor: '$blue5',
				border: '1px solid $blue7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$blueA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$blueA8, 0 0 0 1px $colors$blueA8',
				},
				'&:active': { backgroundColor: '$blueA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$blueA4',
					},
			},
			cyan: {
				backgroundColor: '$cyan5',
				border: '1px solid $cyan7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$cyanA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$cyanA8, 0 0 0 1px $colors$cyanA8',
				},
				'&:active': { backgroundColor: '$cyanA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$cyanA4',
					},
			},
			teal: {
				backgroundColor: '$teal5',
				border: '1px solid $teal7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$tealA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$tealA8, 0 0 0 1px $colors$tealA8',
				},
				'&:active': { backgroundColor: '$tealA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$tealA4',
					},
			},
			gold: {
				backgroundColor: '$gold5',
				border: '1px solid $gold7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$goldA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$goldA8, 0 0 0 1px $colors$goldA8',
				},
				'&:active': { backgroundColor: '$goldA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$goldA4',
					},
			},
			mint: {
				backgroundColor: '$mint5',
				border: '1px solid $mint7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$mintA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$mintA8, 0 0 0 1px $colors$mintA8',
				},
				'&:active': { backgroundColor: '$mintA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$mintA4',
					},
			},
			lime: {
				backgroundColor: '$lime5',
				border: '1px solid $lime7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$limeA4',
					},
				},
				'&:focus': {
					boxShadow: 'inset 0 0 0 1px $colors$limeA8, 0 0 0 1px $colors$limeA8',
				},
				'&:active': { backgroundColor: '$limeA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$limeA4',
					},
			},
			gray: {
				backgroundColor: '$slate5',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$slateA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$slateA8, 0 0 0 1px $colors$slateA8',
				},
				'&:active': { backgroundColor: '$slateA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$slateA4',
					},
			},
			grass: {
				backgroundColor: '$grass5',
				border: '1px solid $grass7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$grassA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$grassA8, 0 0 0 1px $colors$grassA8',
				},
				'&:active': { backgroundColor: '$grassA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$grassA4',
					},
			},
			amber: {
				backgroundColor: '$amber5',
				border: '1px solid $amber7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$amberA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$amberA8, 0 0 0 1px $colors$amberA8',
				},
				'&:active': { backgroundColor: '$amberA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$amberA4',
					},
			},
			brown: {
				backgroundColor: '$brown5',
				border: '1px solid $brown7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$brownA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$brownA8, 0 0 0 1px $colors$brownA8',
				},
				'&:active': { backgroundColor: '$brownA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$brownA4',
					},
			},
			green: {
				backgroundColor: '$green5',
				border: '1px solid $green7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$greenA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$greenA8, 0 0 0 1px $colors$greenA8',
				},
				'&:active': { backgroundColor: '$greenA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$greenA4',
					},
			},
			tomato: {
				backgroundColor: '$tomato5',
				border: '1px solid $tomato7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$tomatoA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$tomatoA8, 0 0 0 1px $colors$tomatoA8',
				},
				'&:active': { backgroundColor: '$tomatoA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$tomatoA4',
					},
			},
			purple: {
				backgroundColor: '$purple5',
				border: '1px solid $purple7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$purpleA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$purpleA8, 0 0 0 1px $colors$purpleA8',
				},
				'&:active': { backgroundColor: '$purpleA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$purpleA4',
					},
			},
			violet: {
				backgroundColor: '$violet5',
				border: '1px solid $violet7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$violetA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$violetA8, 0 0 0 1px $colors$violetA8',
				},
				'&:active': { backgroundColor: '$violetA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$violetA4',
					},
			},
			indigo: {
				backgroundColor: '$indigo5',
				border: '1px solid $indigo7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$indigoA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$indigoA8, 0 0 0 1px $colors$indigoA8',
				},
				'&:active': { backgroundColor: '$indigoA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$indigoA4',
					},
			},
			bronze: {
				backgroundColor: '$bronze5',
				border: '1px solid $bronze7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$bronzeA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$bronzeA8, 0 0 0 1px $colors$bronzeA8',
				},
				'&:active': { backgroundColor: '$bronzeA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$bronzeA4',
					},
			},
			orange: {
				backgroundColor: '$orange5',
				border: '1px solid $orange7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$orangeA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$orangeA8, 0 0 0 1px $colors$orangeA8',
				},
				'&:active': { backgroundColor: '$orangeA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$orangeA4',
					},
			},
			yellow: {
				backgroundColor: '$yellow5',
				border: '1px solid $yellow7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$yellowA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$yellowA8, 0 0 0 1px $colors$yellowA8',
				},
				'&:active': { backgroundColor: '$yellowA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$yellowA4',
					},
			},
			crimson: {
				backgroundColor: '$crimson5',
				border: '1px solid $crimson7',
				borderWidth: '0',
				'@hover': {
					'&:hover': {
						backgroundColor: '$crimsonA4',
					},
				},
				'&:focus': {
					boxShadow:
						'inset 0 0 0 1px $colors$crimsonA8, 0 0 0 1px $colors$crimsonA8',
				},
				'&:active': { backgroundColor: '$crimsonA4' },
				'&[data-radix-popover-trigger][data-state="open"], &[data-radix-dropdown-menu-trigger][data-state="open"]':
					{
						backgroundColor: '$crimsonA4',
					},
			},
		},
		state: {
			active: {
				border: '1px solid $slate7',
				backgroundColor: '$slate4',
				boxShadow: 'inset 0 0 0 1px hsl(206,10%,76%)',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 1px hsl(206,10%,76%)',
					},
				},
				'&:active': {
					backgroundColor: '$slate4',
				},
			},
			waiting: {
				border: '1px solid $slate7',
				backgroundColor: '$slate4',
				boxShadow: 'inset 0 0 0 1px hsl(206,10%,76%)',
				'@hover': {
					'&:hover': {
						boxShadow: 'inset 0 0 0 1px hsl(206,10%,76%)',
					},
				},
				'&:active': {
					backgroundColor: '$slate4',
				},
			},
		},
		rounded: {
			true: {
				borderRadius: '$round',
			},
		},
	},
	compoundVariants: [
		{
			state: 'active',
			variant: 'sky',
			css: {
				backgroundColor: '$sky4',
				'&:active': {
					backgroundColor: '$sky4',
				},
			},
		},
	],
	defaultVariants: {
		size: '1',
		variant: 'ghost',
	},
});
