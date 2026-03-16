import { HTMLAttributes, useState } from "react";

import Button from "./Button";

import { cn } from "@/lib/utils";


export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "success" | "warning" | "info";
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export default function Alert({
  variant = "error",
  dismissible = false,
  onDismiss,
  children,
  className,
  ...props
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const variantStyles = {
    error: "border-retro-red bg-retro-red/10",
    success: "border-retro-green bg-retro-green/10",
    warning: "border-retro-yellow bg-retro-yellow/10",
    info: "border-retro-blue bg-retro-blue/10",
  };

  return (
    <div
      className={cn(
        "rounded-retro border-4 p-4",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn("font-pixel text-sm", {
            "text-retro-red": variant === "error",
            "text-retro-green": variant === "success",
            "text-retro-yellow": variant === "warning",
            "text-retro-blue": variant === "info",
          })}
        >
          {children}
        </span>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className={cn({
              "text-retro-red": variant === "error",
              "text-retro-green": variant === "success",
              "text-retro-yellow": variant === "warning",
              "text-retro-blue": variant === "info",
            })}
          >
            DISMISS
          </Button>
        )}
      </div>
    </div>
  );
}
