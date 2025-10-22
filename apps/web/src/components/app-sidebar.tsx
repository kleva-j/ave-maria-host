import type { AppData } from "@/components/data";

import { NavSecondary } from "@/components/nav-secondary";
import { NavProjects } from "@/components/nav-projects";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Link } from "@tanstack/react-router";
import { Command } from "lucide-react";
import { siteConfig } from "@/config";

const { organization } = siteConfig;

import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  Sidebar,
} from "@/components/ui/sidebar";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & AppData;

export function AppSidebar({
  navSecondary,
  projects,
  navMain,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={"/dashboard"}>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {organization.name}
                  </span>
                  <span className="truncate text-xs">{organization.tier}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
