/// <reference types="vite/client" />

// Tipos adicionales de entorno usados en esta app
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // añadir otras variables VITE_... aquí si es necesario
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
