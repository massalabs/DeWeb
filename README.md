# DeWeb: On-chain Decentralized Web Gateway

DeWeb is your gateway to the decentralized web, enabling seamless access to websites stored on-chain from any device, anywhere in the world.

## Description

DeWeb revolutionizes web accessibility by providing tools to upload, edit, and view websites directly on the blockchain. The project includes two binaries:

- `deweb-cli`: A command-line tool for deploying and managing on-chain websites.
- `deweb-server`: A server application that allows users to access websites stored on-chain through a web browser.

## Getting Started

### Prerequisites

Ensure you have `task` installed. Follow the instructions [here](https://taskfile.dev/installation/).

### Installation

1. Install required tools:

   ```bash
   task install
   ```

2. Build both binaries:

   ```bash
   task build
   ```

   Alternatively, you can build them separately:

   ```bash
   task build:cli
   task build:server
   ```

3. The binaries will be stored in the `./build` directory.

# DeWeb CLI

DeWeb CLI is a command-line tool designed for deploying, editing, and deleting decentralized websites on the DeWeb platform.

## Usage

Once installed, you can use the `deweb-cli` command to interact with DeWeb. Below is the basic usage syntax:

```bash
deweb-cli [global options] command [command options] [arguments...]
```

### Global Options

- `--wallet_nickname, -w`: Specify the wallet nickname to use.
- `--node_url, -n`: Specify the node URL.
- `--config, -c`: Load configuration from a specified file path (default: `./deweb_cli_config.yaml`).

## Commands

### upload

Uploads a new website to the DeWeb platform.

```bash
deweb-cli upload [global options] <website_zip_file_path>
```

#### Arguments

- `<website_zip_file_path>`: Path to the zip file containing the website to be uploaded.

#### Example

```bash
deweb-cli upload -w myWallet -n https://mainnet.massa.net/api/v2 ./website.zip
```

The zip file should contain an `index.html` at its root. For example, if you build an app and the output is in a directory (usually `build` or `dist`), you can zip it using the following command from the output directory:

```bash
zip {name}.zip -r ./*
```

This should result in a zip file with all the files from the output directory, with the `index.html` at its root.

> Note: Server Side Rendering (SSR) is not supported at this time. Ensure your website is fully client-side rendered.

### edit

Edits an existing website on the DeWeb platform.

```bash
deweb-cli edit [global options] <website_sc_address> <website_zip_file_path>
```

#### Arguments

- `<website_sc_address>`: Smart contract address of the website to be edited.
- `<website_zip_file_path>`: Path to the zip file containing the updated website.

#### Example

```bash
deweb-cli edit -w myWallet -n http://node-url.com <website_sc_address> ./updated_website.zip
```

### delete

Deletes an existing website from the DeWeb platform.

```bash
deweb-cli delete [global options] <website_sc_address>
```

#### Arguments

- `<website_sc_address>`: Smart contract address of the website to be deleted.

#### Example

```bash
deweb-cli delete -w myWallet -n http://node-url.com <website_sc_address>
```

## Configuration

The CLI can be configured using a YAML file. By default, it looks for `deweb_cli_config.yaml` in the current directory. You can specify a different configuration file using the `--config` flag.

### Sample Configuration (`deweb_cli_config.yaml`)

```yaml
wallet_config:
  wallet_nickname: "alice"

node_url: "https://buildnet.massa.net/api/v2"

sc_config:
  minimal_fees: 0
  max_gas: 0
  max_coins: 0
  expiry: 0
```

## Logging

The CLI logs its output to `./deweb-cli.log`. Logging is initialized automatically when the application starts.
