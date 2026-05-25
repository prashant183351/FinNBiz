# FinNbiz - Accounting & Business Management

GST-compliant accounting and business management application for Indian SMBs.

**FinNBiz** is a comprehensive **GST-compliant accounting and business management application** designed specifically for Indian SMBs (Small and Medium Businesses).

## What It Does

FinNBiz provides end-to-end financial management with features including:
- **Multi-company tenancy** support
- **GST-compliant invoicing** (CGST/SGST/IGST calculations)
- **Email + OTP authentication**
- **PDF invoice generation**
- **CSV import/export** capabilities
- **Bank reconciliation**
- **GST return exports**

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + PWA
- **Backend**: Express.js + TypeScript + Prisma + PostgreSQL
- **Worker**: Node.js + BullMQ + Redis
- **Deployment**: Netlify (frontend + serverless functions)

## Key Features

- Multi-platform: Web (PWA), Desktop (Electron), Mobile (Capacitor/Android support)
- Enterprise-ready: Email notifications, file uploads (AWS S3), background job processing
- Developer-friendly: pnpm workspaces, Turbo for monorepo management, TypeScript strict mode
- Language Composition: 74.5% TypeScript, 21.3% JavaScript, 4.2% CSS

## Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

### Quick Start

1. **Clone and install dependencies**
    ```bash
    git clone <repository-url>
    cd finnbiz
    pnpm install
    ```

2. **Set up environment variables**
    ```bash
    cp .env.example .env
    # Edit .env with your local database credentials
    ```

3. **Start development infrastructure**
    ```bash
    # Start PostgreSQL, Redis, and Minio
    docker compose -f infra/docker-compose.dev.yml up --build -d
    ```

4. **Set up database**
    ```bash
    # Generate Prisma client
    pnpm db:generate

    # Run migrations
    pnpm db:push

    # (Optional) Seed database
    pnpm db:seed
    ```

5. **Start development servers**
    ```bash
    # Terminal 1: Start API server
    pnpm -C apps/api dev

    # Terminal 2: Start worker
    pnpm -C apps/worker dev

    # Terminal 3: Start frontend
    pnpm -C apps/web dev
    ```

6. **Access the application**
    - Frontend: http://localhost:3000
    - API: http://localhost:3001
    - API Health: http://localhost:3001/health
    - Database Studio: `pnpm db:studio`

### Available Scripts

```bash
# Root level scripts
pnpm dev          # Start all services in development
pnpm build        # Build all packages and apps
pnpm lint         # Run linting across all packages
pnpm test         # Run tests across all packages
pnpm clean        # Clean build artifacts

# Database scripts
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema changes to database
pnpm db:migrate   # Run database migrations
pnpm db:studio    # Open Prisma Studio
pnpm db:seed      # Seed database with initial data

# App-specific scripts
pnpm -C apps/web dev      # Start frontend dev server
pnpm -C apps/api dev      # Start API dev server
pnpm -C apps/worker dev   # Start worker process
```

## Project Structure

```
finnbiz/
├── apps/
│   ├── web/           # Next.js frontend
│   ├── api/           # Express.js backend
│   ├── worker/        # Background job processor
│   └── desktop/       # Electron desktop application
├── packages/
│   ├── shared/        # Shared types and utilities
│   ├── ui/            # Reusable UI components
│   ├── eslint-config-custom/
│   └── prettier-config-custom/
├── infra/             # Infrastructure configs
├── .env.example       # Environment variables template
├── package.json       # Root package.json with workspaces
└── pnpm-workspace.yaml
```

## Development Guidelines

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Custom config with Next.js and import rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for linting and formatting

### Database

- **Prisma**: ORM with PostgreSQL
- **Migrations**: Version-controlled schema changes
- **Seeding**: Initial data population

### Testing

- **Unit Tests**: Jest for individual functions
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for full user flows

## Deployment

### Netlify (Frontend + Serverless Functions)

1. **Connect repository** to Netlify
2. **Set build settings**:
    - Build command: `pnpm build`
    - Publish directory: `apps/web/.next`
    - Functions directory: `apps/web/netlify/functions`
3. **Set environment variables** in Netlify dashboard
4. **Deploy**: Automatic on push to main branch

### Production Database

- Use a managed PostgreSQL service (Supabase, PlanetScale, etc.)
- Set `DATABASE_URL` environment variable
- Run migrations: `pnpm db:migrate`

### Production Redis

- Use Redis Cloud, Upstash, or similar
- Set `REDIS_URL` environment variable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Commit with conventional commits
7. Push and create PR

## License

MIT
