# Payment API (Flow B — Dynamic Bank Transfer Collections)

The BRYT Pay Payment API allows approved partners to collect Nigerian bank transfers from customers **without requiring customers to hold a BRYT Pay account**. Each initialized payment issues a temporary, single-use virtual bank account.

- **Base URL:** `https://brytpay.name.ng/api/v1`
- **Currency:** `NGN`
- **Default Fee:** `1.5%` (configurable per partner)
- **Fee Bearer:** `"merchant"` (deducted from settlement) or `"customer"` (added to transfer amount)

---

## 1. Initialize Payment

`POST /api/v1/payments/initialize`

**Required Scope:** `payments:write`  
**Rate Limit:** 30 requests / minute per partner & environment

### Required Headers
- `Authorization: Bearer bryt_test_sk_...` (or `bryt_live_sk_...`)
- `Content-Type: application/json`
- `Idempotency-Key: <unique-key-8-to-128-chars>`

### Request Body
```json
{
  "amount": 5000,
  "currency": "NGN",
  "customer_email": "student@campuspulse.ng",
  "customer_name": "Amina Musa",
  "customer_phone": "08012345678",
  "partner_reference": "CP_ORDER_10045",
  "fee_bearer": "merchant",
  "metadata": {
    "order_id": "10045"
  }
}

Response (201 Created)
{
  "success": true,
  "message": "Payment initialized successfully.",
  "data": {
    "reference": "BRYT_TEST_1795691133870_157A431A",
    "partner_reference": "CP_ORDER_10045",
    "environment": "test",
    "status": "pending",
    "currency": "NGN",
    "requested_amount": 5000,
    "fee_bearer": "merchant",
    "fee_percent": 1.5,
    "fee_amount": 75,
    "expected_amount": 5000,
    "net_amount": 4925,
    "amount_received": 0,
    "payment_instructions": {
      "method": "bank_transfer",
      "bank_name": "BRYT Sandbox Bank",
      "account_number": "9912345678",
      "account_name": "BRYT TEST/AMINA MUSA",
      "amount_to_pay": 5000,
      "expires_at": "2026-11-26T12:30:00.000Z"
    },
    "customer": {
      "email": "student@campuspulse.ng",
      "name": "Amina Musa",
      "phone": "08012345678"
    },
    "metadata": { "order_id": "10045" },
    "paid_at": null,
    "created_at": "2026-11-26T12:00:00.000Z"
  },
  "request_id": "req_..."
}