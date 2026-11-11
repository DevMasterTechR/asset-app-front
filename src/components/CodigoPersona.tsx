import { codigoDePersona } from '@/lib/nombrePersona';

/** Código de persona (BRYANQ1) en monoespaciado; no pinta nada si no se puede armar. */
export function CodigoPersona({ person, className = '' }: { person: any; className?: string }) {
  const codigo = codigoDePersona(person);
  if (!codigo) return null;
  return (
    <span className={`font-mono text-xs font-bold tracking-wide text-slate-700 ${className}`} title="Código de persona">
      {codigo}
    </span>
  );
}
