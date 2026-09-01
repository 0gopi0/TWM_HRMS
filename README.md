# TWM HRMS

Employee management HRMS: React (Vite) + Express (ES modules) + MySQL.

- Architecture: [docs/architecture.md](docs/architecture.md)
- Local database: [docs/local-setup.md](docs/local-setup.md)

## Run locally

```bash
npm install
npm run dev:api
npm run dev:web
```

- UI: http://localhost:5173
- API: http://127.0.0.1:4000/health

Copy `.env.example` to `.env` and set JWT secrets (16+ characters). If MariaDB is not running, the API falls back to an in-memory store in development.

Demo password for all accounts: `LocalDev!23`

| Name | Email | Role |
| --- | --- | --- |
| Nandha | nandha@twm.local | Developer |
| Gopi | gopi@twm.local | Developer (Team Leader) |
| Manoj | manoj@twm.local | manager |
| Chai | chai@twm.local | HR |

Theme: use the Light / Dark / Auto control in the header (and on the sign-in screen). The layout collapses to a drawer menu below 768px.

## Layout

```
frontend/     React ESM UI
backend/      Express ESM API
packages/shared   Role and permission codes
```
