import type { PropsWithChildren } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalErrorBoundary } from "@/components/error-boundary";
import { SiteHeader } from "@/components/layout/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import { Container } from "@/components/ui/container";
import { data } from "@/components/data";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <GlobalErrorBoundary>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" {...data} />
        <SidebarInset>
          <SiteHeader />
          <Container size="lg">{children}</Container>
        </SidebarInset>
      </SidebarProvider>
    </GlobalErrorBoundary>
  );
}

export default AppLayout;
