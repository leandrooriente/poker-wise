"use client";

import { ActiveGroupProvider } from "@/lib/active-group";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <ActiveGroupProvider>{children}</ActiveGroupProvider>;
}