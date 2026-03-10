"use client";

import { ReactNode } from "react";

import { ActiveGroupProvider } from "@/lib/active-group";

export function Providers({ children }: { children: ReactNode }) {
  return <ActiveGroupProvider>{children}</ActiveGroupProvider>;
}