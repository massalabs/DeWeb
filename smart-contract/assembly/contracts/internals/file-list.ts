import { FILES_PATH_LIST } from '../utils/const';

export function _pushFilePath(filePath: string): void {
  const filePathList = FILES_PATH_LIST.mustValue();
  filePathList.push(filePath);
  FILES_PATH_LIST.set(filePathList);
  _getFilePathList();
}

export function _removeFilePath(filePath: string): void {
  const filePathList = FILES_PATH_LIST.mustValue();
  if (!_isPathFileInList(filePath)) return;
  // TODO: check if it works
  FILES_PATH_LIST.set(filePathList.filter((path) => path !== filePath));
}

export function _getFilePathList(): string[] {
  const result = FILES_PATH_LIST.tryValue();
  if (result.error) {
    FILES_PATH_LIST.set([]);
    return [];
  }
  return result.unwrap();
}

// HELPERS
// TODO - Can cost Gas, how to improve it?
export function _isPathFileInList(filePath: string): bool {
  const filePathList = _getFilePathList();
  for (let i = 0; i < filePathList.length; i++) {
    if (filePathList[i] === filePath) return true;
  }
  return false;
}
