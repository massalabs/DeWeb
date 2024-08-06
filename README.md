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

## CLI Usage

The `DeWeb CLI` allows you to upload and edit websites directly from the terminal.

### Upload a Website

To upload a website to the blockchain:
```bash
deweb-cli upload <wallet_nickname> <website_zip_file_path>
```

- `<wallet_nickname>`: The nickname of your Massa Wallet, downloadable from the Massa Station plugins store.
- `<website_zip_file_path>`: Relative or absolute path to the zip file containing your website.

The zip file should contain an `index.html` at its root. For example, if you build an app and the output is in a directory (usually `build` or `dist`), you can zip it using the following command from the output directory:
```bash
zip {name}.zip -r ./*
```
This should result in a zip file with all the files from the output directory, with the `index.html` at its root.

> Note: Server Side Rendering (SSR) is not supported at this time. Ensure your website is fully client-side rendered.

### Edit a Website

To edit an existing website on the blockchain:
```bash
deweb-cli edit <wallet_nickname> <website_sc_address> <website_zip_file_path>
```

- `<wallet_nickname>`: The nickname of your Massa Wallet.
- `<website_sc_address>`: The smart contract address of the website you want to edit (deployed using the `upload` command).
- `<website_zip_file_path>`: Relative or absolute path to the zip file containing your updated website.

For more information on other available commands, use the CLI help:
```bash
deweb-cli --help
```
