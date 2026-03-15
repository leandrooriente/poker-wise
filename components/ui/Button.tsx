import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", disabled, children, ...props }, ref) => {
    let className = "nes-btn";
    if (variant === "primary") className = "nes-btn is-primary";
    else if (variant === "secondary") className = "nes-btn is-success";
    else if (variant === "danger") className = "nes-btn is-error";
    else className = "nes-btn";

    if (disabled) className = className + " is-disabled";

    return (
      <button ref={ref} className={className} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
