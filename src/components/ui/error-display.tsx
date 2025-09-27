import { AlertTriangle, RefreshCw, XCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  description?: string;
  variant?: "destructive" | "warning" | "info";
  retryable?: boolean;
  onRetry?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({
  title,
  message,
  description,
  variant = "destructive",
  retryable = false,
  onRetry,
  dismissible = false,
  onDismiss,
  className
}: ErrorDisplayProps) {
  const variantStyles = {
    destructive: {
      container: "border-red-500/20 bg-red-500/10",
      icon: "text-red-400",
      title: "text-red-400",
      message: "text-red-300",
      description: "text-red-400",
      button: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
    },
    warning: {
      container: "border-yellow-500/20 bg-yellow-500/10",
      icon: "text-yellow-400",
      title: "text-yellow-400",
      message: "text-yellow-300",
      description: "text-yellow-400",
      button: "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
    },
    info: {
      container: "border-blue-500/20 bg-blue-500/10",
      icon: "text-blue-400",
      title: "text-blue-400",
      message: "text-blue-300",
      description: "text-blue-400",
      button: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
    }
  };

  const styles = variantStyles[variant];

  const getIcon = () => {
    switch (variant) {
      case "warning":
        return <AlertTriangle className={cn("h-5 w-5", styles.icon)} />;
      case "info":
        return <Info className={cn("h-5 w-5", styles.icon)} />;
      default:
        return <XCircle className={cn("h-5 w-5", styles.icon)} />;
    }
  };

  const getDefaultTitle = () => {
    switch (variant) {
      case "warning":
        return "Warning";
      case "info":
        return "Information";
      default:
        return "Error";
    }
  };

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all duration-200",
      styles.container,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 space-y-2 min-w-0">
          {title && (
            <h3 className={cn("font-semibold leading-none tracking-tight", styles.title)}>
              {title}
            </h3>
          )}
          
          <p className={cn("text-sm leading-relaxed", styles.message)}>
            {message}
          </p>
          
          {description && (
            <p className={cn("text-xs leading-relaxed opacity-90", styles.description)}>
              {description}
            </p>
          )}
          
          <div className="flex items-center gap-2 pt-2">
            {retryable && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className={styles.button}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try Again
              </Button>
            )}
            
            {dismissible && onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-gray-400 hover:text-white"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
        
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "flex-shrink-0 rounded-md opacity-70 hover:opacity-100 transition-opacity",
              styles.icon
            )}
          >
            <XCircle className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Full page error component
interface FullPageErrorProps extends ErrorDisplayProps {
  action?: React.ReactNode;
}

export function FullPageError({
  title,
  message,
  description,
  variant = "destructive",
  retryable = false,
  onRetry,
  action,
  className
}: FullPageErrorProps) {
  const getDefaultTitle = () => {
    switch (variant) {
      case "warning":
        return "Warning";
      case "info":
        return "Information";
      default:
        return "Something went wrong";
    }
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm",
      className
    )}>
      <div className="max-w-md w-full mx-4">
        <ErrorDisplay
          title={title || getDefaultTitle()}
          message={message}
          description={description}
          variant={variant}
          retryable={retryable}
          onRetry={onRetry}
          className="mb-6"
        />
        
        {action && (
          <div className="flex justify-center">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline error component for form fields
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-red-400 text-sm", className)}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Toast error component
export function ToastError({ message, description }: { message: string; description?: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-red-300">{message}</p>
          {description && (
            <p className="text-xs text-red-400/80">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Success display component
interface SuccessDisplayProps {
  title?: string;
  message: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessDisplay({
  title,
  message,
  description,
  dismissible = false,
  onDismiss,
  className
}: SuccessDisplayProps) {
  return (
    <div className={cn(
      "rounded-lg border border-green-500/20 bg-green-500/10 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 space-y-2 min-w-0">
          {title && (
            <h3 className="font-semibold text-green-400 leading-none tracking-tight">
              {title}
            </h3>
          )}
          
          <p className="text-sm text-green-300 leading-relaxed">
            {message}
          </p>
          
          {description && (
            <p className="text-xs text-green-400/80 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-green-400/70 hover:text-green-400 transition-opacity"
          >
            <XCircle className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </button>
        )}
      </div>
    </div>
  );
}
