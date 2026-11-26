#### `docs/README.md` (Updated Index)
```markdown
# BRYT Pay Developer API Documentation

Official technical documentation for the **BRYT Pay Developer API**, built and maintained by **BRYT Technologies**.

- **Production Base URL:** `https://brytpay.name.ng/api/v1`
- **API Version:** `v1`
- **Current Build Stage:** Phase 4 — Payment API & Live Collection Rails (Live)

## Documentation Index

- [Authentication & Security Controls](./authentication.md) — API keys, Test vs. Live isolation, HMAC signing, rate limits *(Implemented)*
- [Payment API (Flow B)](./payment-api.md) — Initialize, verify, transactions, settlement balance, sandbox simulator *(Implemented)*
- **Webhook System** — *Next (Phase 5)*
- **Partner Developer Portal & Manual Settlements** — *Planned (Phase 5 / 7)*
- **Educational & Digital Services API** — *Planned (Phase 6)*

## Implemented Endpoints

| Method | Endpoint | Scope | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Service health check |
| `GET` | `/api/v1/auth/me` | Any valid key | Verify credentials, environment, fee config & scopes |
| `POST` | `/api/v1/payments/initialize` | `payments:write` | Issue dynamic single-use bank transfer account |
| `GET` | `/api/v1/payments/verify/{reference}` | `payments:read` | Server-side payment verification |
| `GET` | `/api/v1/transactions` | `transactions:read` | Paginated partner transaction list |
| `GET` | `/api/v1/transactions/{reference}` | `transactions:read` | Single partner transaction lookup |
| `GET` | `/api/v1/balance` | `balance:read` | Partner settlement balance summary |
| `POST` | `/api/v1/sandbox/payments/{reference}/simulate` | `payments:write` (Test only) | Simulate payment outcomes in Sandbox |