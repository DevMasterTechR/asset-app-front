import { useState } from 'react';

export type SortDir = 'asc' | 'desc';

export function useSort(initialKey?: string, initialDir: SortDir = 'asc') {
  const [key, setKey] = useState<string | undefined>(initialKey);
  const [dir, setDir] = useState<SortDir>(initialDir);

  function toggle(k: string) {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setKey(k);
      setDir('asc');
    }
  }

  function apply<T>(arr: T[], selectors: Record<string, (item: T) => string | number | undefined>) {
    if (!key) return arr;
    const selector = selectors[key];
    if (!selector) return arr;
    return arr.slice().sort((a, b) => {
      const va = selector(a) ?? '';
      const vb = selector(b) ?? '';
      // If values are numbers, compare numerically
      if (typeof va === 'number' && typeof vb === 'number') {
        return dir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      const cmp = sa.localeCompare(sb, 'es', { sensitivity: 'base' });
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  return { key, dir, toggle, apply } as const;
}
