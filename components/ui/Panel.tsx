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
        className={cn(
          "rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset border-4 p-6",
          className
        )}
        {...props}
      >
        {title && (
          <h2 className="font-pixel text-retro-green text-title mb-6">
            {title}
          </h2>
        )}
        {children}
      </div>
    );
  }
);

Panel.displayName = "Panel";

export default Panel;
