import { HTMLAttributes, useState } from "react";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "success" | "warning" | "info";
  dismissible?: boolean;
  onDismiss?: () => void;
}

export default function Alert({
  variant = "error",
  dismissible = false,
  onDismiss,
  children,
  ...props
}: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="nes-container is-bordered">
      <div className="nes-flex nes-justify-between nes-items-center">
        <span className="nes-text-sm">{children}</span>
        {dismissible && (
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className="nes-btn is-error"
          >
            DISMISS
          </button>
        )}
      </div>
    </div>
  );
}
