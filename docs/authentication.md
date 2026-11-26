# Authentication & Security Controls

All protected endpoints on the BRYT Pay Developer API require server-to-server authentication over **HTTPS**. Never expose BRYT Pay secret keys in client-side JavaScript, mobile apps, or public repositories.

## 1. Environments & API Key Prefixes

Every partner receives separate **Test (Sandbox)** and **Live** keys:

- **Test Key:** `bryt_test_sk_<48_hex_chars>` — isolated to sandbox data; cannot access live records.
- **Live Key:** `bryt_live_sk_<48_hex_chars>` — accesses live production payment rails and settlement balances.

Keys are displayed **once** upon generation. Only SHA-256 hashes are stored in `public.api_keys`.

## 2. Standard Request Authentication

Send your secret key in the `Authorization` header:

```http
Authorization: Bearer bryt_test_sk_...