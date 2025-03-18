# DeWeb Plugin Homepage

This is the homepage for the DeWeb plugin, providing a central navigation hub and search interface for the decentralized web ecosystem on Massa.

## Features

- Search for DeWeb domains
- Quick access to key DeWeb services:
  - Explore DeWeb: Browse available decentralized websites
  - Massa Name System (MNS): Manage decentralized domain names
  - DeWeb Uploader: Upload and manage websites
- Network status indicator showing connection info

## Development

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The development server will start at http://localhost:5173 (or another port if 5173 is in use).

### Project Structure

- `src/` - Source code
  - `App.tsx` - Main application component
- `public/` - Static assets

## Building for Production

```bash
# Build the project
npm run build

# Build and package for plugin deployment
npm run build:plugin
```

The `build:plugin` command will:
1. Build the project
2. Create a zip file (`dist/home.zip`) for deployment

## Dependencies

This project uses:
- React 19
- TypeScript
- Vite
- TailwindCSS for styling
- React Icons
- DeWeb Pages (local dependency)

## Integration

This homepage is designed to work with the DeWeb plugin for Massa. It communicates with the plugin's API endpoints to retrieve network information and port configurations.

The application dynamically generates URLs based on the current environment (development or production) to ensure proper navigation between different DeWeb services.
