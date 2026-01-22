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
  // Etiqueta inicial para mostrar inmediatamente mientras se cargan las opciones (útil en modo edición)
  initialLabel?: string;
};

// Comparar arrays de opciones por contenido, no por referencia
function areOptionsEqual(a: Option[], b: Option[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].value !== b[i].value || a[i].label !== b[i].label) return false;
  }
  return true;
}

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
  initialLabel,
}: Props) {
  const [query, setQuery] = React.useState("");
  const [internalOptions, setInternalOptions] = React.useState<Option[]>(options);
  const [loading, setLoading] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const prevOptionsRef = React.useRef<Option[]>(options);

  // Buscar la etiqueta del valor actual en las opciones, o usar initialLabel si no se encuentra
  const selectedLabel = React.useMemo(() => {
    if (!value) return undefined;
    const found = options.find(o => o.value === value);
    if (found?.label) return found.label;
    // También buscar en internalOptions por si vino de búsqueda remota
    const foundInternal = internalOptions.find(o => o.value === value);
    if (foundInternal?.label) return foundInternal.label;
    // Usar initialLabel como fallback
    return initialLabel;
  }, [value, options, internalOptions, initialLabel]);

  // Keep options in sync when parent changes static options (solo si cambian de verdad)
  React.useEffect(() => {
    if (!areOptionsEqual(prevOptionsRef.current, options)) {
      prevOptionsRef.current = options;
      setInternalOptions(options);
    }
  }, [options]);

  // Referencia estable para onSearch
  const onSearchRef = React.useRef(onSearch);
  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  React.useEffect(() => {
    let mounted = true;
    
    // Si query está vacío, usar las opciones estáticas (no hacer búsqueda remota)
    const q = query.trim().toLowerCase();
    if (!q) {
      if (!areOptionsEqual(internalOptions, options)) {
        setInternalOptions(options);
      }
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    
    // Si no hay onSearch, hacer búsqueda local
    if (!onSearchRef.current) {
      const filtered = options.filter(
        (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
      );
      if (!areOptionsEqual(internalOptions, filtered)) {
        setInternalOptions(filtered);
      }
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // Solo activar búsqueda remota cuando hay query no vacío
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    timer = setTimeout(() => {
      onSearchRef.current!(query)
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
  }, [query, debounceMs]); // Removido options y onSearch de las dependencias

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
        {/* Mostrar etiqueta del valor seleccionado inmediatamente si existe */}
        {selectedLabel ? (
          <span className="truncate">{selectedLabel}</span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
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
