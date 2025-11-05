import type { QueryClient } from "@tanstack/react-query";
import type { orpc } from "@/utils/orpc";

import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MigrationStatus } from "@/components/migration-status";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Loader } from "@/components/loader";

import {
  createRootRouteWithContext,
  useRouterState,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";

import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { title: "host" },
      { name: "description", content: "host is a web application" },
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });

  // const [client] = useState<AppRouterClient>(() => createORPCClient(link));
  // const [orpcUtils] = useState(() => createTanstackQueryUtils(client));

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="grid grid-rows-[auto_1fr] h-svh">
          {isFetching ? <Loader /> : <Outlet />}
        </div>
        <Toaster richColors />
        <MigrationStatus />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
