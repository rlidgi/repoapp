import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

const AlertDialogContext = createContext(null);

export function AlertDialog({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ asChild, children }) {
  const { setOpen } = useContext(AlertDialogContext);
  const child = React.Children.only(children);

  if (asChild && React.isValidElement(child)) {
    return React.cloneElement(child, {
      onClick: (e) => {
        child.props.onClick?.(e);
        setOpen(true);
      },
    });
  }

  return <button onClick={() => setOpen(true)}>{children}</button>;
}

export function AlertDialogContent({ className, children }) {
  const { open } = useContext(AlertDialogContext);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={cn('bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6', className)}>
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function AlertDialogTitle({ children }) {
  return <h2 className="text-lg font-semibold mb-1">{children}</h2>;
}

export function AlertDialogDescription({ children }) {
  return <p className="text-sm text-slate-600">{children}</p>;
}

export function AlertDialogFooter({ children }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

export function AlertDialogCancel({ className, children, ...props }) {
  const { setOpen } = useContext(AlertDialogContext);
  return (
    <button
      className={cn(
        'px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50',
        className
      )}
      onClick={() => setOpen(false)}
      {...props}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({ className, children, onClick, ...props }) {
  const { setOpen } = useContext(AlertDialogContext);
  return (
    <button
      className={cn(
        'px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700',
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
