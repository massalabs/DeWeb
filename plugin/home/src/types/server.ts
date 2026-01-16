export type ServerStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

export interface NetworkInfo {
  name: string;
  url: string;
  version: string;
  chainId: number;
}

export interface ServerStatusResponse {
  status: ServerStatus;
  serverPort: number;
  errorMessage?: string;
  network?: NetworkInfo;
}

export interface CacheSettings {
  enabled: boolean;
  siteRamCacheMaxItems?: number;
  siteDiskCacheMaxItems?: number;
  diskCacheDir?: string;
  fileListCacheDurationSeconds?: number;
}

export interface Settings {
  networkUrl: string;
  serverPort?: number;
  cache?: CacheSettings;
}