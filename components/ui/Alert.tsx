import { HTMLAttributes, useState } from "react";

import { cn } from "@/lib/utils";

import Button from "./Button";

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

  return (
    <div
      className={cn("nes-container is-bordered", className)}
      style={{
        background:
          variant === "error"
            ? "#fee"
            : variant === "success"
              ? "#efe"
              : variant === "warning"
                ? "#ffe"
                : variant === "info"
                  ? "#eef"
                  : "#eee",
        border:
          variant === "error"
            ? "4px solid #e74c3c"
            : variant === "success"
              ? "4px solid #48c774"
              : variant === "warning"
                ? "4px solid #ffdd57"
                : variant === "info"
                  ? "4px solid #209cee"
                  : "4px solid #ccc",
      }}
      {...props}
    >
      <div className="flex items-start justify-between">
        <span
          className={cn("font-pixel text-sm", {
            "is-error": variant === "error",
            "is-success": variant === "success",
            "is-warning": variant === "warning",
            "is-primary": variant === "info",
          })}
          style={{
            color:
              variant === "error"
                ? "#e74c3c"
                : variant === "success"
                  ? "#48c774"
                  : variant === "warning"
                    ? "#ffdd57"
                    : variant === "info"
                      ? "#209cee"
                      : "#333",
          }}
        >
          {children}
        </span>
        {dismissible && (
          <Button
            variant={
              variant === "error"
                ? "danger"
                : variant === "success"
                  ? "secondary"
                  : variant === "warning"
                    ? "primary"
                    : "primary"
            }
            size="sm"
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            style={{ padding: "4px 8px", fontSize: "10px" }}
          >
            DISMISS
          </Button>
        )}
      </div>
    </div>
  );
}
