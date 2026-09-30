# Space Colony Builder

A 3D browser-based space colony builder simulation built with Three.js, TypeScript, and Vite.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [just](https://github.com/casey/just) task runner

## Getting Started

### Installation

```bash
just install
```

### Development

Start the development server with hot-module replacement:

```bash
just dev
```

The game will be available at `http://localhost:5173`.

### Testing

Run the unit tests once:

```bash
just test
```

To run tests in watch mode:

```bash
npm run test
```

### Building

Build the project for production:

```bash
just build
```

The optimized assets will be generated in the `dist/` directory. You can preview the production build locally with:

```bash
npm run preview
```

## Project Structure

- `src/main.ts`: Entry point.
- `src/game/Game.ts`: Core game engine and Three.js setup.
- `src/core/`: General purpose utilities and math.
- `src/game/`: Game-specific logic and entities.

## License

MIT
