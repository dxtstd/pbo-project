# Object-Oriented Programming (OOP) Project

> A boarding-house management system for rooms, occupants, invoices, payments,
> and WhatsApp notifications.

**Language:** [Bahasa Indonesia (primary)](README.md) | English

## Table of Contents

- [Description](#description)
- [Features](#features)
- [Technology](#technology)
- [Project Structure](#project-structure)
- [Local Development](#local-development)
- [Running with Docker](#running-with-docker)
- [Test Account and Demo](#test-account-and-demo)
- [Technical Documentation](#technical-documentation)
- [Security Notes](#security-notes)

## Description

PBO Kost is a web application that helps boarding-house owners manage their
operations in one place. It provides customer and owner dashboards, invoice
and transaction tracking, Midtrans payments, and WhatsApp payment reminders.

## Features

- Role-based authentication and dashboards.
- Room and occupant management.
- Invoice creation and payment status tracking.
- QRIS, Virtual Account, and cash payment options.
- Owner confirmation for cash payments.
- Midtrans callbacks for online payment status updates.
- WhatsApp notifications for invoice reminders and received payments.
- Owner payment recaps and reports.
- PDF invoice generation.
- A protected admin action to reset all application data.

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Node.js, Express, TypeScript, Mongoose
- **Database:** MongoDB
- **Payments:** Midtrans
- **Notifications:** Zapo.js over WebSocket
- **Reverse proxy:** Nginx
- **Workspace orchestration:** Nx and Docker Compose

## Project Structure

```text
.
├── website/
│   ├── frontend/       # React application
│   └── backend/        # Express API and MongoDB models
├── notification/       # WhatsApp notification worker
├── docker/             # Nginx configuration
├── docker-compose.dev.yml
├── docker-compose.yml
└── package.json
```

## Local Development

### Prerequisites

- Node.js and npm
- A local MongoDB instance when not using Docker
- Docker Desktop (optional, recommended for the complete stack)

### Installation

```sh
npm install
```

Copy the environment example files and adjust their values:

```text
website/frontend/.env.development.example  -> website/frontend/.env.development
website/backend/.env.development.example   -> website/backend/.env.development
notification/.env.development.example      -> notification/.env.development
```

Do not commit environment files containing credentials or secrets.

### Nx Commands

Run the frontend, backend, and notification worker together:

```sh
npm run dev
```

Run only the website applications:

```sh
npm run dev:website
```

Run only the notification worker:

```sh
npm run dev:notification
```

The Nx project names are `frontend`, `backend`, and `notification`.

## Running with Docker

For development:

```sh
docker compose -f docker-compose.dev.yml up --build
```

For production:

```sh
docker compose up --build
```

The application is available at `http://localhost:8080` by default. Set
`HTTP_PORT` to use a different host port.

On the notification worker's first start, scan the QR code printed by the
container. Development stores the session in `notification/.auth`, while
production uses the `zapo-auth` Docker volume.

## Test Account and Demo

- **Live demo:** [Watch the application demo](https://youtu.be/Upphza8kXHc).
- **Public demo URL:** [https://kost.dxtstd.my.id](https://kost.dxtstd.my.id).
- **Local admin username:** `admin` (configurable with `ADMIN_USERNAME`).
- **Local admin password:** configured with `ADMIN_PASSWORD`.

Test account credentials are provided in the project report. They are not
published in this README because they contain sensitive information.

Main dashboard routes:

- `/dashboard/customer` — customer bills and payments.
- `/dashboard/customer/payment` — payment options.
- `/dashboard/owner` — owner occupant data and recaps.

## Technical Documentation

- [Backend and model relationship documentation](website/backend/README.md)
- [Frontend documentation](website/frontend/README.md)

The Midtrans callback endpoint is:

```text
/api/v1/payment/callback
```

Set `MIDTRANS_ENVIRONMENT` to `sandbox` or `production`, then provide the
matching `MIDTRANS_SERVER_KEY`. Online payments are marked as paid only after a
Midtrans callback with `settlement` or `capture` status.

## Security Notes

- Use a long, random `JWT_SECRET` in deployments.
- Keep passwords, API keys, and private keys in the environment only.
- Do not commit `.env` files, `node_modules`, MongoDB data, or WhatsApp
  authentication sessions.
- The admin dashboard includes a permanent **Reset all data** action. It
  requires two confirmations and the exact text `RESET-ALL`.
