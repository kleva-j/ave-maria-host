import { keyframes, styled } from '../../stitches.config';
import { Box } from './Box';

const xSkew = keyframes({
	'0%': { transform: 'translateX(40px)' },
	'50%': { transform: 'translateX(-30px)' },
	'100%': { transform: 'translateX(40px)' },
});

const dotJump = keyframes({
	'0%': { transform: 'translateY(0)' },
	'100%': { transform: 'translateY(-14px)' },
});

const ballTurn = keyframes({
	'0%': { transform: 'rotate(0deg)' },
	'100%': { transform: 'rotate(360deg)' },
});

const rot1 = keyframes({
	'0%': { transform: 'rotate(0)' },
	'50%': {
		transform: 'rotate(180deg)',
		borderTopColor: 'rgb(139, 46, 46)',
		borderBottomColor: 'rgb(243, 92, 33)',
		borderRightColor: 'transparent',
		borderLeftColor: 'transparent',
	},
	'100%': { transform: 'rotate(360deg)' },
});

export const Loader = styled(Box, {
	variants: {
		size: {
			1: { width: '$2', height: '$2' },
			2: { width: '$3', height: '$3' },
			3: { width: '$4', height: '$4' },
			4: { width: '$5', height: '$5' },
			5: { width: '$6', height: '$6' },
		},
		variant: {
			red: {
				backgroundColor: '$red8',
				'&::before, &::after': { backgroundColor: '$red8' },
			},
			blue: {
				backgroundColor: '$blue8',
				'&::before, &::after': { backgroundColor: '$blue8' },
			},
			teal: {
				backgroundColor: '$teal8',
				'&::before, &::after': { backgroundColor: '$teal8' },
			},
			gray: {
				backgroundColor: '$slate8',
				'&::before, &::after': { backgroundColor: '$slate8' },
			},
		},
		spin: {
			true: {
				height: '$8',
				width: '$8',
				borderWidth: '6px',
				borderStyle: 'double',
				borderRadius: '50%',
				borderSpacing: '10px',
				animation: `${ballTurn} 1s linear infinite`,

				'&::before, &::after': {
					content: '""',
					boxSizing: 'border-box',
					position: 'absolute',
					borderRadius: '50%',
					bottom: 0,
					width: '$2',
					height: '$2',
					right: '41px',
				},

				'&::after': { left: '41px', top: 0 },
			},
		},
		dots: {
			true: {
				width: '$2',
				height: '$2',
				borderRadius: '50%',
				position: 'absolute',
				top: 'calc(50% - 5px)',
				animation: `${dotJump} 0.5s cubic-bezier(0.77, 0.47, 0.64, 0.28) alternate infinite`,

				'&::before, &::after': {
					content: '""',
					width: '$2',
					height: '$2',
					borderRadius: '50%',
					position: 'absolute',
					top: 'calc(50% - 5px)',
				},

				'&::before': {
					left: '$4',
					animation: `${dotJump} 0.5s 0.2s cubic-bezier(0.77, 0.47, 0.64, 0.28) alternate infinite`,
				},

				'&::after': {
					left: '40px',
					animation: `${dotJump} 0.5s 0.4s cubic-bezier(0.77, 0.47, 0.64, 0.28) alternate infinite`,
				},
			},
		},
		skew: {
			true: {
				width: '$7',
				height: '$2',
				transform: 'translate(-50%, -50%)',
				borderRadius: '$1',
				position: 'absolute',
				top: '50%',
				left: '50%',
				animation: `${xSkew} 1.8s ease-in-out infinite`,

				'&::before, &::after': {
					content: '""',
					position: 'absolute',
					animation: `${xSkew} 1.8s ease-in-out infinite`,
					height: '$2',
					borderRadius: '$1',
				},

				'&::before': {
					top: '-20px',
					left: '$2',
					width: '$7',
				},
				'&::after': {
					bottom: '-20px',
					width: '$6',
				},
			},
		},
		rot1: {
			true: {
				width: '50px',
				height: '50px',
				display: 'inline-block',
				borderWidth: '$1',
				borderStyle: 'solid',
				borderRadius: '50%',
				borderTopColor: 'transparent',
				borderBottomColor: 'transparent',
				animation: `${rot1} 1s infinite`,
			},
		},
	},
	compoundVariants: [
		{
			variant: 'red',
			spin: true,
			css: {
				backgroundColor: '$red3',
				borderColor: '$red9',
				'&::before, &::after': { backgroundColor: '$red10' },
			},
		},
		{
			variant: 'blue',
			spin: true,
			css: {
				backgroundColor: '$blue3',
				borderColor: '$blue9',
				'&::before, &::after': { backgroundColor: '$blue10' },
			},
		},
		{
			variant: 'gray',
			spin: true,
			css: {
				backgroundColor: '$slate3',
				borderColor: '$slate9',
				'&::before, &::after': { backgroundColor: '$slate10' },
			},
		},
		{
			variant: 'teal',
			spin: true,
			css: {
				backgroundColor: '$teal3',
				borderColor: '$teal9',
				'&::before, &::after': { backgroundColor: '$teal10' },
			},
		},
		{
			variant: 'red',
			rot1: true,
			css: { borderColor: '$red8', backgroundColor: 'transparent' },
		},
		{
			variant: 'blue',
			rot1: true,
			css: { borderColor: '$blue8', backgroundColor: 'transparent' },
		},
		{
			variant: 'teal',
			rot1: true,
			css: { borderColor: '$teal8', backgroundColor: 'transparent' },
		},
		{
			variant: 'gray',
			rot1: true,
			css: { borderColor: '$slate8', backgroundColor: 'transparent' },
		},
	],
	defaultVariants: {
		variant: 'gray',
	},
});
