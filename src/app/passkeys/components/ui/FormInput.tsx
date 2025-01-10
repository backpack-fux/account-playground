interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormInput({ label, className = "", ...props }: FormInputProps) {
  return (
    <div>
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        {...props}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${className}`}
      />
    </div>
  );
}
