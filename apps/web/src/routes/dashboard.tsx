import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { Fragment } from "react";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) redirect({ to: "/login", throw: true });
    return { session };
  },
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  const privateData = useQuery(orpc.privateData.queryOptions());

  return (
    <AppLayout>
      <Fragment>
        <h1>Dashboard</h1>
        <p>Welcome {session.data?.user.name}</p>
        <p>API: {privateData.data?.message}</p>
      </Fragment>
    </AppLayout>
  );
}
