'use client';

import type { ReactNode } from "react";
import { BottomNav, type BottomNavItemLabel } from "./primitives";

export function AppRouteShell({
  children,
  active,
}: {
  children: ReactNode;
  active?: BottomNavItemLabel | null;
}) {
  return (
    <div className="cr-route-shell">
      {children}
      <BottomNav active={active} />
    </div>
  );
}
