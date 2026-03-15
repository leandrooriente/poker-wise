import { HTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  className?: string;
}

const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ title, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("nes-container with-title is-dark", className)}
        {...props}
      >
        {title && <p className="title">{title}</p>}
        {children}
      </div>
    );
  }
);

Panel.displayName = "Panel";

export default Panel;
