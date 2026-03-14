import { ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "toggle";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isActive?: boolean;
  loading?: boolean;
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      isActive = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "font-pixel border-4 rounded-retro transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50";

    const variantClasses = {
      primary:
        "bg-white text-black border-white hover:bg-gray-200 hover:shadow-retro-outset",
      secondary:
        "border-retro-gray bg-transparent text-retro-light hover:border-retro-green hover:text-retro-green",
      danger:
        "border-retro-red bg-transparent text-retro-red hover:bg-retro-red hover:text-retro-dark",
      ghost:
        "border-transparent bg-transparent text-retro-light hover:bg-retro-gray/20",
      toggle: isActive
        ? "border-white bg-white text-black"
        : "border-white bg-transparent text-white hover:bg-white/10",
    };

    const sizeClasses = {
      sm: "px-3 py-1 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-4 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className || ""
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? "LOADING..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
