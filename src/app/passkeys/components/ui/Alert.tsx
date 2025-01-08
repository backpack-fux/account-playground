interface AlertProps {
  variant: "error" | "info" | "success";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  error: "bg-red-100 border-red-400 text-red-700",
  info: "bg-blue-100 border-blue-400 text-blue-700",
  success: "bg-green-100 border-green-400 text-green-700",
};

export function Alert({ variant, children, className = "" }: AlertProps) {
  return (
    <div
      className={`${variantStyles[variant]} px-4 py-3 rounded border ${className}`}
    >
      {children}
    </div>
  );
}
