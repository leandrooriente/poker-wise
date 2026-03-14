import { HTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive";
  className?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const baseStyles = "rounded-retro border-4 border-retro-gray bg-retro-dark";

    const variantClasses: Record<
      "default" | "elevated" | "interactive",
      string
    > = {
      default: baseStyles,
      elevated: `${baseStyles} shadow-retro-outset`,
      interactive: `${baseStyles} hover:border-retro-green cursor-pointer transition-colors`,
    };

    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
