// Airport typeahead. Holds an IATA code as its value and shows matches from /api/airports.
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui';
import { cn } from '@/lib/cn';

interface Props {
  id?: string;
  value: string; // IATA code
  onChange: (code: string) => void;
}

export function AirportInput({ id, value, onChange }: Props) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Keep the text box in sync when the parent swaps values.
  useEffect(() => setText(value), [value]);

  const { data: matches = [] } = useQuery({
    queryKey: ['airports', text],
    queryFn: () => api.airports(text),
    enabled: open && text.length >= 2,
  });

  // Close the list when clicking elsewhere.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        value={text}
        onChange={(e) => {
          setText(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Accept a raw 3-letter code typed without picking from the list.
          if (/^[A-Z]{3}$/.test(text)) onChange(text);
        }}
        placeholder="City or airport"
        className="font-semibold uppercase"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {matches.map((a) => (
            <li key={a.code}>
              <button
                type="button"
                className={cn('flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-amadeus-50', a.code === value && 'bg-amadeus-50')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(a.code);
                  setText(a.code);
                  setOpen(false);
                }}
              >
                <span className="w-10 font-mono font-bold text-amadeus-700">{a.code}</span>
                <span className="flex-1 truncate">
                  {a.city} <span className="text-slate-400">· {a.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
