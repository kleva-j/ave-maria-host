import '@styles/global.css';

import type { Session } from 'next-auth';
import type { AppType } from 'next/app';

import { getSession, SessionProvider } from 'next-auth/react';
import { trpc } from 'utils/trpc';

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps,
}) => {
  return (
    <SessionProvider session={pageProps.session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
};

MyApp.getInitialProps = async ({ ctx }) => ({ session: await getSession(ctx) });

export default trpc.withTRPC(MyApp);
