import { Dialog, DialogTrigger, DialogContent } from '@components/atoms/Dialog';
import { TextField } from '@components/atoms/TextField';
import { Button } from '@components/atoms/Button';
import { Flex } from '@components/atoms/Flex';

export const EmailModal = () => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Dialog</Button>
			</DialogTrigger>
			<DialogContent showClose={false}>
				<form>
					<TextField
						type="email"
						size="1"
						placeholder="Email Address"
						autoComplete="off"
						css={{ mb: '$3' }}
					/>
					<Flex css={{ ai: 'center', jc: 'flex-end' }}>
						<Button size="xs" color="blue">
							Enter
						</Button>
					</Flex>
				</form>
			</DialogContent>
		</Dialog>
	);
};
