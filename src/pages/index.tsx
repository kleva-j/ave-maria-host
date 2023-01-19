import { Navbar } from '@components/molecules/Navbar';
import Head from 'next/head';

export default function IndexPage() {
	return (
		<>
			<Head>
				<title>Prisma Starter</title>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<header>
				<Navbar />
			</header>
		</>
	);
}
