import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const Button = ({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = ''
}: ButtonProps) => {
  const baseStyles = "font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "btn-primary text-white",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600"
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {loading ? (
        <>
          <div className="spinner w-5 h-5"></div>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};