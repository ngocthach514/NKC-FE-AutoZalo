"use client";

import { useEffect, useRef } from "react";
import { type LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NavMain({
  items,
  activeUrl,
  setActiveUrl,
}: {
  items: {
    title: string;
    icon?: LucideIcon;
    items: {
      title: string;
      url: string;
    }[];
  }[];
  activeUrl: string;
  setActiveUrl: (url: string) => void;
}) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeUrl]);

  return (
    <div className="space-y-1 [&_*]:list-none overflow-y-auto max-h-[calc(100vh-64px)] pr-1">
      {items.map((group) => (
        <SidebarGroup key={group.title} className="space-y-1">
          <SidebarMenuItem className="space-y-0.5">
            <div className="text-[15px] font-extrabold uppercase tracking-wide px-3 pt-3 pb-2 cursor-default bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-yellow-500 to-purple-500 animate-gradient-x select-none">
              {group.title}
            </div>
            <SidebarMenuSub className="ml-2 space-y-0.5">
              {group.items.map((subItem) => {
                const isActive = subItem.url === activeUrl;
                const ref = isActive ? activeRef : undefined;

                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <Link
                      href={subItem.url}
                      ref={ref}
                      className={cn(
                        "flex items-center gap-2 truncate text-[15px] font-medium rounded px-3 py-1.5 w-full text-left transition-colors cursor-pointer max-w-full break-words",
                        isActive
                          ? "bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-600 text-white shadow"
                          : "text-gray-800 hover:bg-gray-100 hover:text-black"
                      )}
                      title={subItem.title}
                      onClick={() => setActiveUrl(subItem.url)}
                    >
                      {subItem.title}
                    </Link>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarGroup>
      ))}
    </div>
  );
}
