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
 * Splits an array into chunks of at most `size` elements.
 * The last chunk holds the remainder and may be shorter.
 * @param items - the array to split
 * @param size - the maximum number of elements per chunk
 * @returns an array of chunks, empty if `items` is empty
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error(`chunk size must be strictly positive, got ${size}`)
  }

  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
