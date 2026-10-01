import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';

export function Section({ id, className = '', children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`max-w-7xl mx-auto px-5 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 border border-brand-200/60 ${className}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';
  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm hover:shadow-md hover:-translate-y-0.5',
    secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-200/60',
    ghost: 'text-sand-700 hover:bg-sand-100',
    outline: 'border border-sand-300 text-sand-800 hover:border-brand-400 hover:text-brand-700 bg-white',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
      <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-block w-5 h-5 border-2 border-brand-200 border-t-brand-700 rounded-full animate-spin ${className}`} />
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-sand-100 flex items-center justify-center mb-4">
        <span className="text-2xl">—</span>
      </div>
      <h3 className="text-lg font-bold text-sand-900">{title}</h3>
      <p className="text-sand-500 mt-1.5 max-w-sm mx-auto">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-sand-200 overflow-hidden shimmer">
      <div className="aspect-[4/3] bg-sand-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-sand-200 rounded w-3/4" />
        <div className="h-3 bg-sand-200 rounded w-1/2" />
        <div className="h-6 bg-sand-200 rounded w-1/3" />
      </div>
    </div>
  );
}
