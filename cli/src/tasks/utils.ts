/**
 * Formats a number of bytes into a human-readable string
 * @param bytes - the number of bytes to format
 * @returns a human-readable string of the bytes
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Returns the maximum of two bigints
 * @param a - the first bigint
 * @param b - the second bigint
 * @returns the maximum of the two bigints
 */
export function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b
}