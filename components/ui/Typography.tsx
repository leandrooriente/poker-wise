import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Title({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn("font-pixel nes-text is-primary", className)} {...props}>
      {children}
    </h1>
  );
}

export function Heading({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("font-pixel nes-text is-warning", className)} {...props}>
      {children}
    </h2>
  );
}

export function Subheading({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-pixel nes-text is-primary", className)} {...props}>
      {children}
    </h3>
  );
}

export function Body({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("font-retro-sans", className)} {...props}>
      {children}
    </p>
  );
}

export function Label({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "font-pixel nes-text is-warning mb-2 block text-sm",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Caption({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("font-retro-sans nes-text is-disabled text-sm", className)}
      {...props}
    >
      {children}
    </span>
  );
}
