# ServiCore: Multi-Tenant Service Management Platform

A ticketing and service-desk platform where every organization gets its own isolated workspace. Staff manage teams, tickets and reporting; customers use a separate portal. Built end to end with **Angular 19** and **ASP.NET Core 8**.

**Live demo:** https://servicore-lovat.vercel.app/
**Backend repo:** https://github.com/AhmedMohamed2022/ServiCore-Multi-Tenant-Service-Management-Platform-Backend

<!-- Add 2-3 screenshots or one short GIF here: dashboard, ticket details, customer portal. -->
<!-- ![Dashboard](docs/dashboard.png) -->

## Try it

Registering creates your own organization with you as **Owner**, so there are no shared logins. Open the demo, choose **Get started**, and you have a private workspace in under a minute.

> The first request after a period of inactivity may be slow while the API wakes up.

## Features

- **Multi-tenancy:** every request is scoped to an organization; users can belong to several and switch between them.
- **Roles:** Owner, Manager and Agent for staff, plus an isolated Customer portal. Enforced by route guards on the client and authorization policies on the server.
- **Ticket workflow:** `New → Open → In progress → Waiting for customer → Resolved → Closed`, with each action offered only to the people allowed to take it. Four priority levels (Low to Critical).
- **Teams and assignment:** route tickets to teams, assign to agents, support unassigned tickets.
- **Realtime:** SignalR delivers notifications and ticket comments instantly.
- **Reporting:** ticket, team, agent, customer and category statistics plus a time-series view, over any date range.
- **Invitations:** email invitations for staff and customers, with preview and accept flows for new and existing users.
- **Management console:** teams, customer directory, categories and invitations.

## Tech stack

| Layer    | Technology                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Frontend | Angular 19 (standalone components, signals, lazy routes), Tailwind CSS, Angular Material/CDK, ngx-charts, SignalR client |
| Backend  | ASP.NET Core 8, Clean Architecture (Domain / Application / Infrastructure / API), EF Core 8, SQL Server                  |
| Auth     | ASP.NET Identity, JWT bearer, organization-role authorization handlers                                                   |
| Realtime | SignalR hub                                                                                                              |
| Email    | MailKit (SMTP)                                                                                                           |
| Tests    | xUnit unit tests; integration tests for tenant isolation, role rules, ticket visibility and workflow                     |
| Hosting  | Vercel (frontend)                                                                                                        |

## Architecture

```
Angular SPA ──HTTPS + JWT + tenant header──▶ ASP.NET Core API ──▶ SQL Server
     ▲                                          │
     └────────────── SignalR hub ◀──────────────┘
```

- **Tenant resolution:** a client interceptor attaches the active organization; server middleware resolves it and role policies check membership on every request.
- **Frontend structure:** `core/` (auth, guards, interceptors, services), `features/` (auth, dashboard, tickets, management, customer-portal, shell), `shared/ui/` (design-system components).
- **Design system:** one set of CSS custom properties drives both Tailwind utilities and Angular Material, so colors, radii and shadows are defined once.

## Run locally

Requires Node 20+ and the backend running (see its README).

```bash
npm install
npm start          # http://localhost:4200
```

For a production build, the API URL must be provided and use HTTPS:

```bash
SERVICORE_API_BASE_URL=https://your-api.example.com/api npm run build
```

Local development uses `src/environments/environment.development.ts`.

## Deployment

The frontend deploys to Vercel (`vercel.json` rewrites all routes to `index.html`). Set `SERVICORE_API_BASE_URL` in the project's environment variables. The API must list the frontend origin under `Cors:AllowedOrigins`.

## Project status

Feature-complete for the core flows. Planned: seeded demo data, broader frontend test coverage, CI.

## Author

Ahmed Mohamed: [GitHub](https://github.com/AhmedMohamed2022)
