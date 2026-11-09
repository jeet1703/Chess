import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const base =
  "group inline-flex items-center justify-center gap-2 font-semibold rounded-xl " +
  "transition-all duration-200 ease-out active:scale-[0.98] " +
  "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]";

const variants = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] " +
    "shadow-[inset_0_-3px_0_rgba(0,0,0,0.18),0_10px_24px_-10px_rgba(47,125,79,0.7)] hover:-translate-y-0.5",
  dark:
    "bg-stone-900 text-white hover:bg-stone-800 shadow-[0_10px_24px_-12px_rgba(28,25,23,0.6)] hover:-translate-y-0.5",
  secondary:
    "bg-white text-stone-800 ring-1 ring-stone-200 hover:ring-stone-300 hover:bg-stone-50",
  ghost: "text-stone-600 hover:text-stone-900 hover:bg-stone-100",
};

const sizes = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-4 text-lg",
};

export const Button = ({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = ''
}: ButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
  >
    {loading && <span className="spinner w-4 h-4" />}
    {children}
  </button>
);
