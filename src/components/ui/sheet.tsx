import * as React from 'react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80" onClick={() => onOpenChange(false)} />
      {/* Content */}
      <div className="fixed inset-y-0 left-0 z-50 w-3/4 max-w-sm animate-in slide-in-from-left">
        {children}
      </div>
    </>
  );
}

interface SheetContentProps {
  className?: string;
  children: React.ReactNode;
}

export function SheetContent({ className, children }: SheetContentProps) {
  return (
    <div className={cn('flex h-full flex-col bg-card p-6 shadow-lg', className)}>{children}</div>
  );
}

interface SheetHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function SheetHeader({ className, children }: SheetHeaderProps) {
  return <div className={cn('flex flex-col space-y-2 text-left', className)}>{children}</div>;
}

interface SheetTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function SheetTitle({ className, children }: SheetTitleProps) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>;
}
