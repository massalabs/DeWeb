# DeWeb Local Pages

This project contains DeWeb local pages. These pages can be built for DeWeb using the provided build scripts. Developers can view and modify the content of the pages using the development server.

## Getting Started

### Install Dependencies

Before you start, make sure to install the necessary dependencies:

```sh
npm install
```

### Development Server
To start the development server and view or modify the content of the pages, run:

```sh
npm run dev
```

This will start a local server with hot module replacement (HMR) enabled, allowing you to see your changes in real-time.

### Building for DeWeb

To build all the pages for DeWeb, run the following command:

```sh
task generate
```

This command will build all pages using `npm run build:all` and zip each page separately.
