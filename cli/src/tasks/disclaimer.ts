import { promises as fs, existsSync } from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import { configDirPath } from './utils'
import yaml from 'yaml'
import readline from 'readline'

interface LegalFile {
  content: Buffer
  hash: string
}

/**
 * Handles the disclaimer logic, including retrieving legal files, comparing hashes,
 * displaying the disclaimer, and saving updated hashes.
 */
export async function handleDisclaimer(): Promise<void> {
  try {
    // Get the legal filegetLegalFilesDirs
    const legalFiles = await getLegalFiles()

    // Get the hashes of the legal files stored locally
    const localHashesMap = await getLegalStoredHash()

    const newOrUpdatedLegal: Record<string, LegalFile> = {}

    // Compare hashes of legal files with their locally stored hashes
    for (const [fileName, legalFile] of Object.entries(legalFiles)) {
      const localHash = localHashesMap[fileName]
      if (!localHash || localHash !== legalFile.hash) {
        newOrUpdatedLegal[fileName] = legalFile
      }
    }

    // If no new or updated legal files, no need to display disclaimer
    if (Object.keys(newOrUpdatedLegal).length === 0) {
      return
    }

    // Display the disclaimer and ask for user acceptance
    const accepted = await displayDisclaimer(newOrUpdatedLegal)

    // If the user does not accept the terms, exit the program
    if (!accepted) {
      console.error(
        'For legal reasons, terms of uses need to be accepted to be allowed to use deweb provider'
      )
      process.exit(1)
    }

    // Save updated local hashes back to the config
    await saveLegalStoredHash(localHashesMap, newOrUpdatedLegal)
  } catch (err) {
    throw new Error(`Error handling disclaimer: ${(err as Error).message}`)
  }
}

/**
 * Displays the content of all LegalFiles in the console and asks the user to validate them.
 * @param legalFiles - A map of file names to LegalFile objects.
 * @returns A promise that resolves to a boolean indicating whether the user accepted the terms.
 */
async function displayDisclaimer(
  legalFiles: Record<string, LegalFile>
): Promise<boolean> {
  console.log('DISCLAIMERS:')
  for (const legalFile of Object.values(legalFiles)) {
    const plainText = legalFile.content.toString()
    console.log(plainText + '\n\n')
    console.log('----------------------------------')
  }

  // Ask the user to accept the terms of use
  const maxAttempts = 3
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const response = await promptUser(
      'Do you accept all legal terms of use? (y/n): '
    )

    switch (response.toLowerCase()) {
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

/**
 * Prompts the user for input via the console.
 * @param question - The question to display to the user.
 * @returns A promise that resolves to the user's input.
 */
function promptUser(question: string): Promise<string> {
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
 * GetLegalFiles returns a Record where keys are file names and values are
 * LegalFile type (the doc content and its SHA-256 hashes).
 */
export async function getLegalFiles(): Promise<Record<string, LegalFile>> {
  const filesMap: Record<string, LegalFile> = {}
  const legalFilesDir = getLegalFilesDir()

  try {
    const entries = await fs.readdir(legalFilesDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(legalFilesDir, entry.name)

      const data = await fs.readFile(fullPath)
      const hash = createHash('sha256').update(data).digest('hex')

      filesMap[entry.name] = {
        content: data,
        hash: hash,
      }
    }
  } catch (err) {
    throw new Error(`Could not retrieve legal docs: ${(err as Error).message}`)
  }

  return filesMap
}

const legalDisclaimerLocalConfigFileName = 'disclaimer.yaml'

/**
 * Retrieves the path to the disclaimer.yaml file in the user's configuration directory.
 * If the "deweb-cli" directory or the file doesn't exist, it creates them.
 */
export async function getDisclaimerStoredFilePath(): Promise<string> {
  try {
    // Get the configuration directory path
    const configDir = await configDirPath()

    // Construct the full path to the disclaimer.yaml file
    const disclaimerConfPath = path.join(
      configDir,
      legalDisclaimerLocalConfigFileName
    )

    // Check if the file exists
    try {
      await fs.stat(disclaimerConfPath)
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'ENOENT') {
        // Create the disclaimer.yaml file if it doesn't exist
        await fs.writeFile(disclaimerConfPath, '', { mode: 0o777 })
      } else {
        throw new Error(
          `Failed to check ${disclaimerConfPath}: ${error.message}`
        )
      }
    }

    return disclaimerConfPath
  } catch (err) {
    throw new Error(
      `Failed to retrieve disclaimer file path: ${(err as Error).message}`
    )
  }
}

/**
 * Retrieves a map of file names and their corresponding hashes
 * from the YAML file returned by getDisclaimerStoredFilePath.
 */
export async function getLegalStoredHash(): Promise<Record<string, string>> {
  try {
    // Get the path to the disclaimer.yaml file
    const disclaimerConfPath = await getDisclaimerStoredFilePath()

    // Read the content of the file
    const data = await fs.readFile(disclaimerConfPath, 'utf8')

    // Parse the YAML content into a map
    let hashMap: Record<string, string> = {}
    if (data.trim().length > 0) {
      hashMap = yaml.parse(data) as Record<string, string>
    }

    return hashMap
  } catch (err) {
    throw new Error(
      `Failed to retrieve legal stored hash: ${(err as Error).message}`
    )
  }
}

/**
 * Saves the given map of file names and their corresponding hashes in YAML format
 * to the YAML file returned by getDisclaimerStoredFilePath.
 * This function overwrites the existing content of the file.
 */
export async function saveLegalStoredHash(
  oldHashMap: Record<string, string>,
  newHashMap: Record<string, LegalFile>
): Promise<void> {
  try {
    // Get the path to the disclaimer.yaml file
    const disclaimerConfPath = await getDisclaimerStoredFilePath()

    const updatedHashMap = {
      ...oldHashMap,
      ...Object.fromEntries(
        Object.entries(newHashMap).map(([fileName, legalFile]) => [
          fileName,
          legalFile.hash,
        ])
      ),
    }

    // Convert the map to YAML format
    const data = yaml.stringify(updatedHashMap)

    // Write the YAML data to the file
    await fs.writeFile(disclaimerConfPath, data, { mode: 0o777 })
  } catch (err) {
    throw new Error(
      `Failed to save legal stored hash: ${(err as Error).message}`
    )
  }
}

/**
 * Returns the path to the legal files directory.
 * Checks for the existence of the directory in production and development paths.
 * @returns The path to the legal files directory.
 * @throws An error if neither directory exists.
 */
export function getLegalFilesDir(): string {
  const prodPath = path.resolve(__dirname, '../public/legal')
  const devPath = path.resolve(__dirname, '../../public/legal')
  if (existsSync(prodPath)) {
    return prodPath
  } else if (existsSync(devPath)) {
    return devPath
  } else {
    throw new Error('Legal files directory not found.')
  }
}
