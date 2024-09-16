import { FILES_PATH_LIST } from '../utils/const';

/**
 * Adds a new file path to the list of file paths.
 * @param filePath - The file path to be added.
 */
export function _pushFilePath(filePath: string): void {
  const filePathList = FILES_PATH_LIST.mustValue();
  filePathList.push(filePath);
  FILES_PATH_LIST.set(filePathList);
  _getFilePathList();
}

/**
 * Removes a file path from the list of file paths.
 * If the file path is not in the list, this function does nothing.
 * @param filePath - The file path to be removed.
 */
export function _removeFilePath(filePath: string): void {
  const filePathList = FILES_PATH_LIST.mustValue();
  if (!_isPathFileInList(filePath)) return;

  const newFilePathList: string[] = [];
  for (let i = 0; i < filePathList.length; i++) {
    if (filePathList[i] !== filePath) {
      newFilePathList.push(filePathList[i]);
    }
  }

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

/**
 * Checks if a given file path exists in the list of file paths.
 * @param filePath - The file path to check.
 * @returns True if the file path is in the list, false otherwise.
 */
export function _isPathFileInList(filePath: string): bool {
  const filePathList = _getFilePathList();
  for (let i = 0; i < filePathList.length; i++) {
    if (filePathList[i] === filePath) return true;
  }
  return false;
}
