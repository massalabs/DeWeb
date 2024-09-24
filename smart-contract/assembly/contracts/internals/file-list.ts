import { FILES_PATH_LIST } from './const';

/**
 * Adds a new file path to the list of file paths.
 * @param filePath - The file path to be added.
 */
export function _pushFilePath(filePath: string): void {
  const filePathList = FILES_PATH_LIST.mustValue();
  filePathList.push(filePath);
  FILES_PATH_LIST.set(filePathList);
}

/**
 * Removes a file path from the list of file paths.
 * If the file path is not in the list, this function does nothing.
 * @param filePath - The file path to be removed.
 */
export function _removeFilePath(filePath: string): void {
  const filePathList = FILES_PATH_LIST.mustValue();

  const newFilePathList: string[] = [];
  for (let i = 0; i < filePathList.length; i++) {
    if (filePathList[i] !== filePath) {
      newFilePathList.push(filePathList[i]);
    }
  }

  assert(
    newFilePathList.length < filePathList.length,
    'File not found in list',
  );

  FILES_PATH_LIST.set(newFilePathList);
}

/**
 * Retrieves the list of file paths.
 * If the list doesn't exist, it initializes an empty list.
 * @returns An array of file paths.
 */
export function _getFilePathList(): string[] {
  const result = FILES_PATH_LIST.tryValue();
  if (result.error) {
    FILES_PATH_LIST.set([]);
    return [];
  }
  return result.unwrap();
}
