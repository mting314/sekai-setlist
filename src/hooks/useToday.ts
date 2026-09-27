import { useEffect, useState } from 'react';

/**
 * Today as YYYY-MM-DD in local time, or undefined during SSR / prerender and the first client
 * render, so date-dependent UI never mismatches the static HTML.
 */
export function useToday(): string | undefined {
  const [today, setToday] = useState<string>();
  useEffect(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setToday(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }, []);
  return today;
}
