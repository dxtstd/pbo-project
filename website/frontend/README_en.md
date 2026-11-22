# PBO Kost Frontend

The PBO Kost frontend is built with React and TypeScript. It provides the
public pages, login, customer dashboard, owner dashboard, and admin dashboard.

**Language:** [Bahasa Indonesia (primary)](README.md) | English  
Workspace documentation: [main README](../../README.md)

## Features

- Home, facilities, and contact pages.
- Role-based login redirects.
- Customer dashboard for rooms, invoices, transaction history, and payments.
- Owner dashboard for rooms, customers, payments, monthly recaps, reports, and
  notification settings.
- Admin dashboard for configuration and notification management.
- Route protection for `admin`, `owner`, and `customer` roles.
- Invoice PDF generation and downloads.
- Responsive UI built with Tailwind CSS.

## Technology

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Zustand
- QRCode

## Source Structure

```text
src/
├── components/     # Shared components and route protection
├── pages/          # Public, admin, customer, and owner pages
├── stores/         # Authentication and application state
├── utils/          # Utilities, including invoice generation
├── config.ts       # API URL, notification URL, and request helpers
├── App.tsx         # Main route configuration
└── main.tsx        # Application entry point
```

## Local Development

From the repository root:

```sh
npm install
npm run dev:website
```

Or from this directory:

```sh
npm install
npm run dev
```

Vite runs the frontend at `http://localhost:5173`. With
`npm run dev`, the frontend is also available through the reverse proxy at
`http://localhost:8080`.

## Environment

Copy `.env.development.example` to `.env.development`:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_NOTIFICATION_URL=http://localhost:4000
```

In development, these values have the same built-in fallbacks. In production,
`VITE_API_URL` and `VITE_NOTIFICATION_URL` must be configured. With the
production Docker Compose stack, the frontend uses reverse-proxy paths:

```env
VITE_API_URL=/api/v1
VITE_NOTIFICATION_URL=/notification
```

## Commands

```sh
npm run dev      # Development server with HMR
npm run build    # Type-check and production build
npm run lint     # Run ESLint
npm run preview  # Preview the build output
```

The frontend build output is written to `dist/`.
