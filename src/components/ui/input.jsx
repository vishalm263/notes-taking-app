import React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type || "text"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm",
          "bg-background text-foreground placeholder:text-muted-foreground",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input }; 