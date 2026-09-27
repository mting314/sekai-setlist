/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_ENV__APP_VERSION: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
