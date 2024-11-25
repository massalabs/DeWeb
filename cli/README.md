# DeWeb CLI

DeWeb CLI is a command-line tool designed for developers to manage website deployments on the Massa blockchain. It provides commands for uploading, managing, and debugging website files directly on the blockchain, simplifying the deployment process.

For more information about the DeWeb CLI, how to use it, and how to upload a website to the Massa blockchain, see the [DeWeb CLI documentation](https://docs.massa.net/docs/deweb/cli/overview).

## Getting Started

### Prerequisites

To use and work on the DeWeb CLI, you need to have the following tools installed:
- **Node.js** (version 18.0 or higher) and **npm** installed. You can check your versions with:
    ```bash
    node -v
    npm -v
    ```
    If you don't have Node.js installed, you can download it from the [official website](https://nodejs.org/).

- A **Massa account**. If you don't have one, you can create one using the Massa Wallet available as a plugin of [Massa Station](https://station.massa.net/). You can follow the instructions in the [Massa Wallet documentation](https://docs.massa.net/docs/massaStation/massa-wallet/getting-started) to install the wallet and create an account.

### Installation

1. Install dependencies:
    ```bash
    npm install
    ```

2. Build the CLI:
    ```bash
    npm run build
    ```

3. The CLI will be stored in the `./bin` directory and can be run using:
    ```bash
    npm run start
    ```

### Run in development mode

To run the CLI in development mode, you can use:
```bash
npm run dev
```
