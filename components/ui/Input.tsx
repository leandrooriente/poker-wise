import { InputHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  error?: boolean;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <input
        type="text"
        className={cn(
          "border-retro-gray bg-retro-dark text-retro-light rounded-retro font-retro-sans focus:border-retro-green w-full border-4 px-4 py-3 transition-colors focus:outline-none",
          error && "border-retro-red focus:border-retro-red",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
