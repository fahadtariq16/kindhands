/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API in production, e.g. https://api.kindhands.example. Empty = same origin. */
  readonly VITE_API_URL?: string;
}
