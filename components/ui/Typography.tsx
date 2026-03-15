import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Title({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn("font-pixel", className)}
      style={{ color: "#209cee" }}
      {...props}
    >
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
    <h2
      className={cn("font-pixel", className)}
      style={{ color: "#ffdd57" }}
      {...props}
    >
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
    <h3
      className={cn("font-pixel", className)}
      style={{ color: "#209cee" }}
      {...props}
    >
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
    <p
      className={cn("font-retro-sans", className)}
      style={{ color: "#fff" }}
      {...props}
    >
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
      className={cn("font-pixel mb-2 block text-sm", className)}
      style={{ color: "#ffdd57" }}
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
      className={cn("font-retro-sans text-sm", className)}
      style={{ color: "#999" }}
      {...props}
    >
      {children}
    </span>
  );
}
