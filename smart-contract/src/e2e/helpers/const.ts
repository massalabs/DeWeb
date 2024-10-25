import { strToBytes } from '@massalabs/massa-web3';

export const JS_FILE = 'index.js';
export const CSS_FILE = 'index.css';
export const HTML_FILE = 'index.html';
export const CONTRACT_FILE = 'deweb-interface.wasm';
export const CHUNK_LIMIT = 4 * 1024;
export const projectPath = 'src/e2e/test-project/dist';

export const FILE_TAG: Uint8Array = strToBytes('\x01FILE');
export const FILE_LOCATION_TAG: Uint8Array = strToBytes('\x02LOCATION');
export const CHUNK_TAG: Uint8Array = strToBytes('\x03CHUNK');
export const CHUNK_NB_TAG: Uint8Array = strToBytes('\x04CHUNK_NB');
export const FILE_METADATA_TAG: Uint8Array = strToBytes('\x05FM');
export const GLOBAL_METADATA_TAG: Uint8Array = strToBytes('\x06GM');
export const DEWEB_VERSION_TAG: Uint8Array = strToBytes('\xFFDEWEB_VERSION');
