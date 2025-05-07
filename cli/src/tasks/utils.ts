import { promises as fs } from 'fs'
import * as path from 'path'
import readline from 'readline'

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

  const unixLikeHandling = (): string => {
    // Unix-like systems (Linux, BSD, etc.)
    const xdg = process.env.XDG_CONFIG_HOME
    if (xdg) {
      if (!path.isAbsolute(xdg)) {
        throw new Error('path in $XDG_CONFIG_HOME is relative')
      }
      return xdg
    } else {
      const home = process.env.HOME || ''
      if (!home)
        throw new Error('neither $XDG_CONFIG_HOME nor $HOME are defined')
      return path.join(home, '.config')
    }
  }

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

    case 'linux':
    case 'freebsd':
    case 'openbsd': {
      // Unix-like systems (Linux, BSD, etc.)
      dir = unixLikeHandling()
      break
    }

    default: {
      console.warn(
        `Unsupported platform: ${platform}. Retrieving user config dir like in Unix-like systems. `
      )
      dir = unixLikeHandling()
    }
  }

  return dir
}

/**
 * Prompts the user for input via the console.
 * @param question - The question to display to the user.
 * @returns A promise that resolves to the user's input.
 */
export function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * Prompts the user for a yes/no response.
 * @param question - The question to display to the user.
 * @returns A promise that resolves to true if the user answers 'y', and false if the user answers 'n'.
 */
export async function promptYesNo(
  question: string,
  maxAttempts = 3
): Promise<boolean> {
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const answer = await promptUser(`${question} (y/n): `)
    switch (answer.toLowerCase()) {
      case 'y':
        return true
      case 'n':
        return false
      default:
        console.log("Invalid input. Please enter 'y' for yes or 'n' for no.")
    }
  }
  // If the user fails to provide valid input after maxAttempts, assume "no"
  console.log("Maximum attempts reached. Assuming 'no'.")
  return false
}
