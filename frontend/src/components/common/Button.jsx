import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  ...props
}) {
  const base = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-700";

  const variants = {
    primary: "bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm border border-emerald-900",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-sm",
    outline: "bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-700/50 shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900",
    danger: "bg-rose-700 hover:bg-rose-800 text-white shadow-sm"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5"
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}
