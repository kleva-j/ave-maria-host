import { Heading } from '@components/atoms/Heading';
import { Link } from '@components/atoms/Link';
import { Text } from '@components/atoms/Text';
import { Box } from '@components/atoms/Box';

export const Sidebar = () => {
	return (
		<Box>
			<Heading>Quick nav</Heading>
			<Box as="ul" css={{ p: 0, mt: '$4' }}>
				<Box css={{ my: '$1' }}>
					<Link
						href="#accordion"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Accordion
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#alert" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Alert
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#alertdialog"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Alert Dialog
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#avatar"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Avatar
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#badge" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Badge
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#banner"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Banner
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#button"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Button
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#card" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Card
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#checkbox"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Checkbox
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#chip" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Chip
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#container"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Container
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#contextmenu"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Context Menu
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#controlgroup"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Control Group
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#code" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Code
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#dialog"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Dialog
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#dropdownmenu"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Dropdown Menu
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#kbd" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Kbd
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#link" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Link
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#loader"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Loader
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#popover"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Popover
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#progressbar"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Progress Bar
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#radio" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Radio
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#radiocard"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Radio Card
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#section"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Section
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#sheet" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Sheet
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#slider"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Slider
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#status"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Status
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#switch"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Switch
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#table" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Table
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#tablink"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							TabLink
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#tabs" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Tabs
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link href="#text" variant="subtle" css={{ display: 'inline-flex' }}>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Text
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#textarea"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Textarea
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#TextField"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							TextField
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#typography"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Typography
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#simpletoggle"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Simple Toggle
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#skeleton"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Skeleton
						</Text>
					</Link>
				</Box>
				<Box css={{ my: '$1' }}>
					<Link
						href="#verifiedbadge"
						variant="subtle"
						css={{ display: 'inline-flex' }}
					>
						<Text size="2" css={{ lineHeight: '20px' }}>
							Verified Badge
						</Text>
					</Link>
				</Box>
			</Box>
		</Box>
	);
};
