import { cn } from "@/lib/utils";

export interface ContainerProps extends React.ComponentProps<"div"> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

function Container({ className, size = "lg", ...props }: ContainerProps) {
  return (
    <div
      data-slot="container"
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        {
          "max-w-screen-sm": size === "sm",
          "max-w-screen-md": size === "md",
          "max-w-screen-lg": size === "lg",
          "max-w-screen-xl": size === "xl",
          "max-w-screen-2xl": size === "2xl",
          "max-w-none": size === "full",
        },
        className
      )}
      {...props}
    />
  );
}

export { Container };
