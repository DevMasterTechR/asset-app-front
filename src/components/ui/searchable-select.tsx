import React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
  SelectSeparator,
} from "@/components/ui/select";

type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

type Props = {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  // Remote search function. If provided, it will be called with the query string and should return Option[]
  onSearch?: (query: string) => Promise<Option[]>;
  // If provided, initial static options fallback
  options?: Option[];
  debounceMs?: number;
};

export default function SearchableSelect({
  value,
  onValueChange,
  placeholder = "Selecciona...",
  searchPlaceholder = "Buscar...",
  disabled = false,
  className,
  onSearch,
  options = [],
  debounceMs = 300,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [internalOptions, setInternalOptions] = React.useState<Option[]>(options);
  const [loading, setLoading] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  // Keep options in sync when parent changes static options
  React.useEffect(() => {
    setInternalOptions(options);
  }, [options]);

  React.useEffect(() => {
    let mounted = true;
    if (!onSearch) {
      const q = query.trim().toLowerCase();
      if (!q) {
        setInternalOptions(options);
      } else {
        setInternalOptions(
          options.filter(
            (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
          ),
        );
      }
      return () => {
        mounted = false;
      };
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    timer = setTimeout(() => {
      onSearch(query)
        .then((res) => {
          if (mounted) setInternalOptions(res ?? []);
        })
        .catch(() => {
          if (mounted) setInternalOptions([]);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }, debounceMs);

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [query, onSearch, options, debounceMs]);

  function findScrollableParent(el?: HTMLElement | null): HTMLElement | (Window & typeof globalThis) {
    if (!el) return window;
    let parent: HTMLElement | null = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const canScroll = parent.scrollHeight > parent.clientHeight && (overflowY === "auto" || overflowY === "scroll");
      if (canScroll) return parent;
      parent = parent.parentElement;
    }
    return window;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) return;
    // small timeout to let the content render/layout if needed
    requestAnimationFrame(() => {
      const triggerEl = triggerRef.current;
      if (!triggerEl) return;

      const rect = triggerEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // approximate desired space for dropdown (matches max-h-96 ~ 384px)
      const desired = 360;
      if (spaceBelow >= desired) return;

      const delta = desired - spaceBelow + 12; // small padding
      const scrollable = findScrollableParent(triggerEl);
      try {
        if (scrollable === window) {
          window.scrollBy({ top: delta, behavior: "smooth" });
        } else {
          (scrollable as HTMLElement).scrollBy({ top: delta, behavior: "smooth" });
        }
      } catch (e) {
        // fallback: do nothing
      }
    });
  };

  return (
    <Select value={value} onValueChange={(v) => onValueChange?.(v)} onOpenChange={handleOpenChange}>
      <SelectTrigger ref={triggerRef as any} className={cn("w-full", className)} disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent side="bottom" align="start" sideOffset={6}>
        <div className="px-2 py-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <SelectSeparator />

        {loading ? (
          <div className="p-2 text-sm text-muted-foreground">Cargando...</div>
        ) : internalOptions.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">No hay resultados</div>
        ) : (
          internalOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
