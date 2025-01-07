# DeWeb Station Plugin

The DeWeb Station Plugin is a plugin for the DeWeb Station that allows you to install and run the DeWeb Server really easily on your computer.

## Developer guide

### Prerequisites

Ensure you have `task` installed. Follow the instructions [here](https://taskfile.dev/installation/).

### Setup

1. Install required tools:

   ```bash
   task install
   ```

2. Generate:

   ```bash
   task generate
   ```

3. Build the plugin binary:

   ```bash
   task build
   ```

4. The binary will be stored in the `./build` directory.

### Install

To install the plugin, you can use the following command:

```bash
task install-plugin
```
