import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-red-700 text-sm font-bold mb-2 ml-1">
        {label}
      </label>
      <input
        className={`appearance-none border border-red-900/10 rounded-xl w-full py-3 px-4 bg-zinc-900 text-white leading-tight focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-all backdrop-blur-sm placeholder-zinc-500 shadow-sm ${className}`}
        {...props}
      />
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
    return (
      <div className="mb-4">
        <label className="block text-red-700 text-sm font-bold mb-2 ml-1">
          {label}
        </label>
        <div className="relative">
            <select
            className={`appearance-none border border-red-900/10 rounded-xl w-full py-3 px-4 bg-zinc-900 text-white leading-tight focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-all backdrop-blur-sm shadow-sm ${className}`}
            {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-800 text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-red-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
            </div>
        </div>
      </div>
    );
  };