import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export interface ToggleButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> {
  isActive: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}

const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  (
    {
      isActive = false,
      size = "md",
      fullWidth = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "font-pixel border-4 rounded-retro transition-all duration-200 cursor-pointer";

    const sizeClasses = {
      sm: "px-4 py-3 text-xs",
      md: "px-4 py-4 text-sm",
      lg: "px-6 py-5 text-base",
    };

    const activeClasses = isActive
      ? "border-white bg-white text-black"
      : "border-white bg-transparent text-white hover:bg-white/10";

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          sizeClasses[size],
          activeClasses,
          fullWidth && "w-full",
          className || ""
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ToggleButton.displayName = "ToggleButton";

export default ToggleButton;
