import { promises as fs } from 'fs'
import * as path from 'path'

const dewebCliConfigDirName = 'deweb-cli'

/**
 * Returns the path where the DeWeb provider config files are stored.
 * Creates the directory if it doesn't exist.
 */
export async function configDirPath(): Promise<string> {
  try {
    // Get the user's config directory
    const configDir = await userConfigDir()
    const dewebCliConfDir = path.join(configDir, dewebCliConfigDirName)

    // Check if the directory exists
    try {
      await fs.stat(dewebCliConfDir)
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'ENOENT') {
        // Create the directory if it doesn't exist
        await fs.mkdir(dewebCliConfDir, { recursive: true })
      } else {
        throw new Error(`Checking DeWeb provider directory: ${error.message}`)
      }
    }

    return dewebCliConfDir
  } catch (err) {
    throw new Error(`Getting user config directory: ${(err as Error).message}`)
  }
}

/**
 * Returns the path to the user's config directory based on the operating system.
 * The function mimic the behavior of the os.UserConfigDir() function in Go (used in DeWeb provider, station ...)
 * Throws an error if the directory cannot be determined.
 */
function userConfigDir(): string {
  const platform = process.platform
  let dir: string

  switch (platform) {
    case 'win32': {
      dir = process.env.APPDATA || ''
      if (!dir) throw new Error('%AppData% is not defined')
      break
    }

    case 'darwin': {
      // 'darwin' covers macOS in Node.js
      const home = process.env.HOME || ''
      if (!home) throw new Error('$HOME is not defined')
      dir = path.join(home, 'Library', 'Application Support')
      break
    }

    default: {
      // Unix-like systems (Linux, BSD, etc.)
      const xdg = process.env.XDG_CONFIG_HOME
      if (xdg) {
        if (!path.isAbsolute(xdg)) {
          throw new Error('path in $XDG_CONFIG_HOME is relative')
        }
        dir = xdg
      } else {
        const home = process.env.HOME || ''
        if (!home)
          throw new Error('neither $XDG_CONFIG_HOME nor $HOME are defined')
        dir = path.join(home, '.config')
      }
      break
    }
  }

  return dir
}
