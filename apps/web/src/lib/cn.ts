// Merges Tailwind class names, resolving conflicts (e.g. `p-2` vs `p-4`).
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
