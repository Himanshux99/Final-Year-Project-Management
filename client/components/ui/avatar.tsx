import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
}

function Avatar({ className = "", size = "default", ...props }: AvatarProps) {
  const sizes = {
    sm: "h-6 w-6 text-xs",
    default: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  return (
    <div
      className={`relative flex shrink-0 overflow-hidden rounded-full ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

function AvatarImage({
  className = "",
  src,
  alt = "",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError || !src) {
    return null;
  }

  return (
    <img
      className={`aspect-square h-full w-full object-cover ${className}`}
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

export interface AvatarFallbackProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "student" | "faculty" | "default";
}

function AvatarFallback({
  className = "",
  variant = "default",
  children,
  ...props
}: AvatarFallbackProps) {
  const variants = {
    student: "bg-blue-100 text-blue-700",
    faculty: "bg-purple-100 text-purple-700",
    default: "bg-gray-100 text-gray-700",
  };

  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
