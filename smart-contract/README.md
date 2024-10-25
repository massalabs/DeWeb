# Deweb Smart Contract

## Build

By default this will build all files in `assembly/contracts` directory.

```shell
npm run build
```

## Deploy a smart contract

Prerequisites :

- You must add a `.env` file at the root of the repository with the following keys set to valid values :
  - WALLET_SECRET_KEY="wallet_secret_key"
  - JSON_RPC_URL_PUBLIC=<https://test.massa.net/api/v2:33035>

These keys will be the ones used by the deployer script to interact with the blockchain.

The following command will build contracts in `assembly/contracts` directory and execute the deployment script
`src/deploy.ts`. This script will deploy on the node specified in the `.env` file.

```shell
npm run deploy
```

You can modify `src/deploy.ts` to change the smart contract being deployed, and to pass arguments to the constructor
function:

- line 31: specify what contract you want to deploy
- line 33: create the `Args` object to pass to the constructor of the contract you want to deploy

When the deployment operation is executed on-chain, the
[constructor](https://github.com/massalabs/massa-sc-toolkit/blob/main/packages/sc-project-initializer/commands/init/assembly/contracts/main.ts#L10)
function of the smart contract being deployed will
be called with the arguments provided in the deployment script.

The deployment script uses [massa-sc-deployer library](https://www.npmjs.com/package/@massalabs/massa-sc-deployer)
to deploy smart contracts.

You can edit this script and use [massa-web3 library](https://www.npmjs.com/package/@massalabs/massa-web3)
to create advanced deployment procedure.

For more information, please visit our ReadTheDocs about
[Massa smart-contract development](https://docs.massa.net/en/latest/web3-dev/smart-contracts.html).

## Unit tests

The test framework documentation is available here: [as-pect docs](https://as-pect.gitbook.io/as-pect)

```shell
npm run test
```

## Format code

```shell
npm run fmt
```

# Contract Description

## Overview

This smart contract implements a decentralized web storage system on the Massa blockchain. It allows users to upload, update, and delete files, as well as manage metadata for both individual files and the entire storage system.

## Datastore Layout

This smart contract does not provide explicit "Read" functions. Instead, users can directly read from the datastore to retrieve information. The following table outlines the datastore layout, providing the datastore representation for each data category.

| Category            | Datastore Representation                                     | Description                                                |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| **Version**         |                                                              |                                                            |
| DeWeb Version       | `["DEWEB_VERSION_TAG"]`                                      | Stores the version of the decentralized web implementation |
| **Files**           |                                                              |                                                            |
| Chunk Count         | `[FILE_TAG][hash(location)][CHUNK_NB_TAG]`                   | Stores the number of chunks for a file                     |
| Chunk Data          | `[FILE_TAG][hash(location)][CHUNK_TAG][index]`               | Stores the data for a specific chunk of a file             |
| **Global Metadata** |                                                              |                                                            |
| Global Metadata     | `[GLOBAL_METADATA_TAG][metadataKey]`                         | Stores global metadata values                              |
| **File Metadata**   |                                                              |                                                            |
| File Metadata       | `[FILE_TAG][hash(location)][FILE_METADATA_TAG][metadataKey]` | Stores metadata specific to a file                         |
| **File Location**   |                                                              |                                                            |
| File Path           | `[FILE_LOCATION_TAG][hash(location)]`                        | Stores the path of a file                                  |

### Notes:
1. `hash(location)` represents the hashed value of the file's location or path.
2. `index` in chunk data represents the sequential number of the chunk within the file.
3. `metadataKey` represents the key for a specific metadata entry.

To read data from the smart contract, users should construct the appropriate key using this datastore layout and query the contract's storage directly. This approach allows for efficient data retrieval without the need for additional function calls.

For example, to retrieve the number of chunks for a file, you would use the key:
```
[FILE_TAG][hash(file_location)][CHUNK_NB_TAG]
```

Similarly, to retrieve a specific chunk of a file, you would use:
```
[FILE_TAG][hash(file_location)][CHUNK_TAG][chunk_index]
```

This direct access to the datastore provides flexibility and efficiency in reading data from the smart contract.
## Available Interface Functions

The following table provides a detailed overview of the smart contract's interface functions:

| Function | Description | Parameters | Access |
|----------|-------------|------------|--------|
| `constructor` | Initializes the smart contract and sets the deployer as the owner. | `_: StaticArray<u8>` (unused) | Public |
| `filesInit` | Initializes the contract storage with given files and metadata. Allows for setting up initial file structure and global metadata. | `_binaryArgs: StaticArray<u8>` (Serialized `FileInit` objects, files to delete, and global metadata) | Owner Only |
| `uploadFileChunks` | Uploads chunks of a file to the contract storage. Used for adding or updating file content. | `_binaryArgs: StaticArray<u8>` (Serialized array of `FileChunkPost` objects) | Owner Only |
| `removeFileChunkRange` | Removes a specified range of file chunks from storage. Useful for partial file deletions or updates. | `_binaryArgs: StaticArray<u8>` (Serialized file hash location, start index, and end index) | Owner Only |
| `deleteFiles` | Deletes specified files from the contract storage. Removes all associated chunks and metadata. | `_binaryArgs: StaticArray<u8>` (Serialized array of `FileDelete` objects) | Owner Only |
| `setMetadataGlobal` | Sets or updates global metadata for the contract. Applies to the entire storage system. | `_binaryArgs: StaticArray<u8>` (Serialized array of `Metadata` objects) | Owner Only |
| `removeMetadataGlobal` | Removes specified global metadata entries from the contract. | `_binaryArgs: StaticArray<u8>` (Serialized array of metadata keys to remove) | Owner Only |
| `setMetadataFile` | Sets or updates metadata for a specific file in the storage. | `_binaryArgs: StaticArray<u8>` (Serialized file hash location and array of `Metadata` objects) | Owner Only |
| `removeMetadataFile` | Removes specified metadata entries for a particular file. | `_binaryArgs: StaticArray<u8>` (Serialized file hash location and array of metadata keys to remove) | Owner Only |
| `withdrawCoins` | Allows the owner to withdraw funds from the contract balance. | `binaryArgs: StaticArray<u8>` (Serialized amount to withdraw) | Owner Only |
| `receiveCoins` | Handles receiving coins and generates an event logging the transaction. | None | Public |
| `upgradeSC` | Upgrades the smart contract bytecode. Allows for contract updates. | `args: StaticArray<u8>` (New bytecode) | Owner Only |
| `setOwner` | Sets a new owner for the contract. Imported from `@massalabs/sc-standards`. | `binaryArgs: StaticArray<u8>` (Serialized new owner address) | Owner Only |
