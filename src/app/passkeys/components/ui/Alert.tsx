interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "success";
}

const variantStyles = {
  error: "bg-red-50 text-red-700 border-red-200",
  success: "bg-green-50 text-green-700 border-green-200",
};

export function Alert({
  variant = "error",
  className = "",
  ...props
}: AlertProps) {
  return (
    <div
      className={`p-4 rounded-md border ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}
