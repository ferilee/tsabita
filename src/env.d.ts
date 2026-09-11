/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DB_FILE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
