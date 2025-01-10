interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}
      {...props}
    />
  );
}
