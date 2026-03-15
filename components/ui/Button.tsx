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
    const variantClasses = {
      primary: "nes-btn is-primary",
      secondary: "nes-btn is-success",
      danger: "nes-btn is-error",
      ghost: "nes-btn",
      toggle: isActive ? "nes-btn is-primary" : "nes-btn",
    };

    const sizeClasses = {
      sm: "",
      md: "",
      lg: "",
    };

    const fullWidthClass = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          fullWidthClass,
          disabled && "is-disabled",
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
