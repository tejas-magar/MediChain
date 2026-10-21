# MediLedger

> Privacy-conscious medical record management and verification platform.

This repository is organized as an npm workspaces monorepo containing the frontend, backend API, and smart contracts workspaces configured with strict TypeScript checks, consistent linting, and environment variable validation.

---

## Workspace Structure

```
.
├── apps/
│   ├── api/          # Express + TypeScript backend API
│   └── web/          # React + Vite + TypeScript frontend
├── contracts/        # Hardhat + Solidity smart contracts workspace
├── docs/
│   └── design-system.md # Clinical design system & component guidelines
├── .env.example      # Environment variables template (placeholders only)
├── .gitignore        # Gitignore for secrets, build outputs, and node_modules
├── eslint.config.js  # Unified ESLint 9 configuration
└── tsconfig.base.json# Strict base TypeScript compiler options
```

---

## Design System

The clinical design system is documented in [docs/design-system.md](file:///c:/Users/anand/OneDrive/Desktop/MediChain/docs/design-system.md).
It provides reusable, accessible React components (`apps/web/src/components/ui/`) tailored for hospital, pathology laboratory, and verification environments:

- **Tokens**: Centralized color palette (Navy `#0F2B3C`, Medical Blue `#0254A2`, Slate canvas `#F8FAFC`), 4px spacing grid, and typography scales.
- **Components**: Button variants, Form inputs with validation, Status badges (`verified`, `pending`, `revoked`), Cards, Data tables, Modals, Confirm dialogs, Inline alerts, Floating toasts, Loading skeletons, and Empty states.
- **Accessibility**: Full WCAG AA compliance, visible keyboard focus rings, and screen-reader aria properties.

---

## Prerequisites

- **Node.js**: `>= 22.0.0`
- **npm**: `>= 10.0.0`

---

## Setup Instructions

1. **Install all dependencies from the root repository:**

   ```bash
   npm install
   ```

2. **Configure environment variables (optional for default development):**

   ```bash
   cp .env.example .env
   ```

   _Default values:_
   - Backend Port: `3001`
   - Frontend Port: `5173`
   - CORS Origin: `http://localhost:5173`

---

## Running the Applications

### Start the Backend API (port 3001)

```bash
npm run dev:api
```

Health check endpoint: `http://localhost:3001/health`

### Start the Frontend Web App (port 5173)

```bash
npm run dev:web
```

Open `http://localhost:5173` in your browser.

---

## Code Quality & Verification

Execute all quality checks from the repository root:

```bash
# Run strict TypeScript checks across all workspaces
npm run typecheck

# Run consistent ESLint across all workspaces
npm run lint

# Check formatting with Prettier
npm run format:check

# Format code with Prettier
npm run format

# Run test suites
npm run test

# Production build of frontend and backend
npm run build
```

---

## Smart Contracts Workspace

```bash
# Compile contracts
npm run compile --workspace=contracts

# Run contract tests
npm run test --workspace=contracts
```
