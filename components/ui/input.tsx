'use client';

import { cn } from '@/lib/utils';
import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg',
          'px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
          'focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]',
          'resize-none transition-colors',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg',
          'px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]',
          'focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]',
          'transition-colors',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
