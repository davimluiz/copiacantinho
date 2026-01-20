import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyle = "font-bold py-3 px-6 rounded-xl transition-all active:scale-95 focus:outline-none shadow-md disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm";
  
  const variants = {
    // Red gradient for primary
    primary: "bg-gradient-to-r from-red-600 to-red-700 text-white hover:brightness-110 border border-red-500/50",
    
    // Transparent red for secondary
    secondary: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    
    // Dangerous dark red
    danger: "bg-red-800 text-white hover:bg-red-900 border border-red-700"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button 
      type={props.type || 'button'} 
      className={`${baseStyle} ${variants[variant]} ${widthClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};