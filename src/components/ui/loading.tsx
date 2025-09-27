import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  variant?: "spinner" | "dots" | "pulse";
}

export function Loading({ 
  size = "md", 
  className, 
  text, 
  variant = "spinner" 
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className={cn("animate-bounce rounded-full bg-current", sizeClasses.sm)} style={{ animationDelay: "0ms" }} />
        <div className={cn("animate-bounce rounded-full bg-current", sizeClasses.sm)} style={{ animationDelay: "150ms" }} />
        <div className={cn("animate-bounce rounded-full bg-current", sizeClasses.sm)} style={{ animationDelay: "300ms" }} />
        {text && <span className={cn("ml-2 text-gray-400", textSizes[size])}>{text}</span>}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className={cn("animate-pulse rounded-full bg-current opacity-75", sizeClasses[size])} />
        {text && <span className={cn("ml-2 text-gray-400", textSizes[size])}>{text}</span>}
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={cn("flex items-center", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && <span className={cn("ml-2 text-gray-400", textSizes[size])}>{text}</span>}
    </div>
  );
}

// Full page loading component
interface FullPageLoadingProps extends LoadingProps {
  message?: string;
  submessage?: string;
}

export function FullPageLoading({ 
  message = "Loading...", 
  submessage,
  size = "lg",
  className 
}: FullPageLoadingProps) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm", className)}>
      <div className="flex flex-col items-center space-y-4">
        <Loading size={size} />
        {message && (
          <p className="text-lg font-medium text-white">{message}</p>
        )}
        {submessage && (
          <p className="text-sm text-gray-400">{submessage}</p>
        )}
      </div>
    </div>
  );
}

// Card loading component for skeleton screens
interface CardLoadingProps {
  lines?: number;
  className?: string;
}

export function CardLoading({ lines = 3, className }: CardLoadingProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header skeleton */}
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 bg-gray-700 rounded-lg animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-700 rounded animate-pulse w-1/2" />
        </div>
      </div>
      
      {/* Content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-700 rounded animate-pulse" />
          {i === lines - 1 && (
            <div className="h-4 bg-gray-700 rounded animate-pulse w-5/6" />
          )}
        </div>
      ))}
      
      {/* Footer skeleton */}
      <div className="flex justify-between pt-4">
        <div className="h-8 bg-gray-700 rounded animate-pulse w-20" />
        <div className="h-8 bg-gray-700 rounded animate-pulse w-24" />
      </div>
    </div>
  );
}

// Table loading component
interface TableLoadingProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableLoading({ rows = 5, columns = 4, className }: TableLoadingProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header row */}
      <div className="grid grid-cols-4 gap-4 pb-2 border-b border-gray-700">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-6 bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
      
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn(
                "h-4 bg-gray-700 rounded animate-pulse",
                colIndex === 0 && "w-3/4",
                colIndex === 1 && "w-full",
                colIndex === 2 && "w-1/2",
                colIndex === 3 && "w-2/3"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}
