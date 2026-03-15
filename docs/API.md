# InboxIQ API Documentation

## Base URL

| Environment | URL                                              |
|-------------|--------------------------------------------------|
| Development | `http://localhost:8000`                          |
| Production  | `https://your-render-url.onrender.com`           |

Interactive API docs (Swagger UI) are available at `<base_url>/docs`.
ReDoc is available at `<base_url>/redoc`.

---

## Authentication

InboxIQ uses [Supabase Auth](https://supabase.com/docs/guides/auth) (JWT-based). All protected endpoints require a valid Supabase JWT passed as a Bearer token.

```
Authorization: Bearer <supabase_jwt_token>
```

Obtain a token by calling `POST /auth/signin` or via the Supabase client library on the frontend.

---

## Endpoints

### Health

#### `GET /health`

Returns service health status. No authentication required.

**Response `200 OK`**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-14T10:00:00Z"
}
```

---

### Authentication

#### `POST /auth/signup`

Create a new user account.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "Jane Smith"
}
```

**Response `201 Created`**
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "session": { "access_token": "jwt...", "token_type": "bearer" },
  "message": "Account created. Check your email to confirm."
}
```

---

#### `POST /auth/signin`

Sign in with email and password.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response `200 OK`**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

#### `POST /auth/signout`

Sign out the current user. Requires authentication.

**Response `200 OK`**
```json
{ "message": "Signed out successfully" }
```

---

#### `GET /auth/me`

Get the current authenticated user's profile. Requires authentication.

**Response `200 OK`**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Smith",
  "company_description": "A SaaS startup...",
  "tone_preference": "professional",
  "gmail_connected": true,
  "notification_email": true,
  "notification_slack": false,
  "urgency_threshold": 7,
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

### Emails

All email endpoints require authentication.

#### `GET /emails`

List emails for the authenticated user.

**Query Parameters**

| Parameter      | Type    | Default | Description                                        |
|----------------|---------|---------|----------------------------------------------------|
| `category`     | string  | —       | Filter by category (e.g. `enterprise_client`, `newsletter`) |
| `min_priority` | integer | —       | Only return emails with priority >= this value (1-10) |
| `processed`    | boolean | —       | Filter by AI processing status                     |
| `limit`        | integer | `20`    | Max results per page (max 100)                     |
| `offset`       | integer | `0`     | Pagination offset                                  |

**Response `200 OK`**
```json
{
  "emails": [
    {
      "id": "uuid",
      "subject": "Urgent: Contract renewal",
      "sender": "Sarah Johnson",
      "sender_email": "sarah@client.com",
      "received_at": "2026-03-14T08:00:00Z",
      "priority": 9,
      "category": "enterprise_client",
      "ai_summary": "Client requires signed contract by Friday EOD.",
      "confidence_score": 0.95,
      "processed": true,
      "read": false
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /emails/stats`

Aggregate statistics for the user's inbox.

**Response `200 OK`**
```json
{
  "total_emails": 142,
  "unread_count": 38,
  "high_priority_count": 12,
  "processed_count": 130,
  "categories": {
    "enterprise_client": 18,
    "internal": 45,
    "newsletter": 62,
    "other": 17
  },
  "avg_priority": 4.7
}
```

---

#### `GET /emails/priority-inbox`

Returns emails organized into priority buckets for the inbox view.

**Response `200 OK`**
```json
{
  "critical": [...],
  "high": [...],
  "medium": [...],
  "low": [...]
}
```

---

#### `GET /emails/{id}`

Get a single email by ID.

**Response `200 OK`** — full email object including `body`, `body_html`, `action_items`, and `reply_draft`.

**Response `404 Not Found`**
```json
{ "detail": "Email not found" }
```

---

#### `POST /emails/process/{id}`

Trigger AI processing (classification, summarization, draft generation) for a specific email.

**Response `200 OK`**
```json
{
  "message": "Email processed successfully",
  "email_id": "uuid",
  "priority": 9,
  "category": "enterprise_client",
  "summary": "Client requires signed contract by Friday EOD.",
  "action_items": ["Review contract", "Reply by Thursday"],
  "draft_created": true
}
```

---

#### `DELETE /emails/{id}`

Delete an email record. Does not delete from Gmail.

**Response `200 OK`**
```json
{ "message": "Email deleted" }
```

---

### Actions

#### `GET /actions`

List all action items for the authenticated user.

**Query Parameters**

| Parameter | Type   | Default   | Description                                      |
|-----------|--------|-----------|--------------------------------------------------|
| `status`  | string | —         | Filter by status: `pending`, `in_progress`, `completed`, `cancelled` |

**Response `200 OK`**
```json
{
  "actions": [
    {
      "id": "uuid",
      "email_id": "uuid",
      "task": "Review and sign contract renewal documents",
      "deadline": "2026-03-16T17:00:00Z",
      "status": "pending",
      "created_at": "2026-03-14T09:00:00Z"
    }
  ]
}
```

---

#### `GET /actions/email/{email_id}`

Get all action items extracted from a specific email.

**Response `200 OK`** — array of action objects.

---

#### `PUT /actions/{id}`

Update an action item.

**Request Body**
```json
{
  "task": "Review, sign, and return contract documents",
  "deadline": "2026-03-16T17:00:00Z",
  "status": "in_progress"
}
```

**Response `200 OK`** — updated action object.

---

#### `DELETE /actions/{id}`

Delete an action item.

**Response `200 OK`**
```json
{ "message": "Action deleted" }
```

---

### Reply Drafts

#### `GET /replies/email/{email_id}`

Get the AI-generated reply draft for a specific email.

**Response `200 OK`**
```json
{
  "id": "uuid",
  "email_id": "uuid",
  "draft_text": "Hi Sarah, thank you for the reminder...",
  "edited_text": null,
  "confidence": 0.87,
  "sent": false,
  "created_at": "2026-03-14T09:05:00Z"
}
```

**Response `404 Not Found`** — no draft exists for this email.

---

#### `PUT /replies/{id}`

Update (edit) a reply draft before sending.

**Request Body**
```json
{
  "draft_text": "Hi Sarah,\n\nThank you for the reminder. I will have the signed documents back to you by Thursday EOD.\n\nBest,\nAlex"
}
```

**Response `200 OK`** — updated draft object.

---

#### `POST /replies/{id}/send`

Send a reply via Gmail using the draft text.

**Response `200 OK`**
```json
{
  "message": "Reply sent successfully",
  "gmail_message_id": "msg_abc123",
  "sent_at": "2026-03-14T10:30:00Z"
}
```

**Response `400 Bad Request`**
```json
{ "detail": "Gmail not connected. Please connect your Gmail account first." }
```

---

### Integrations

#### `GET /integrations/gmail/connect`

Initiate the Gmail OAuth flow. Returns a redirect URL to Google's consent screen.

**Response `200 OK`**
```json
{ "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

---

#### `GET /integrations/gmail/callback`

OAuth callback handler (internal). Exchanges the authorization code for tokens and stores them. Redirects the user to the frontend on completion.

> This endpoint is called by Google's OAuth service — do not call it directly.

---

#### `GET /integrations/gmail/status`

Check whether Gmail is connected for the current user.

**Response `200 OK`**
```json
{
  "connected": true,
  "gmail_address": "user@gmail.com",
  "last_sync": "2026-03-14T09:00:00Z"
}
```

---

#### `DELETE /integrations/gmail/disconnect`

Revoke Gmail access and delete stored tokens.

**Response `200 OK`**
```json
{ "message": "Gmail disconnected successfully" }
```

---

#### `POST /integrations/slack/webhook`

Save a Slack incoming webhook URL for notifications.

**Request Body**
```json
{ "webhook_url": "https://hooks.slack.com/services/T.../B.../..." }
```

**Response `200 OK`**
```json
{ "message": "Slack webhook saved successfully" }
```

---

#### `POST /integrations/slack/test`

Send a test message to the configured Slack webhook.

**Response `200 OK`**
```json
{ "message": "Test message sent to Slack" }
```

---

#### `DELETE /integrations/slack/disconnect`

Remove the Slack webhook URL.

**Response `200 OK`**
```json
{ "message": "Slack disconnected successfully" }
```

---

### Settings

#### `GET /settings`

Get current user settings.

**Response `200 OK`**
```json
{
  "tone_preference": "professional",
  "notification_email": true,
  "notification_slack": false,
  "urgency_threshold": 7,
  "gmail_connected": true,
  "slack_connected": false
}
```

---

#### `PUT /settings`

Update user settings.

**Request Body** (all fields optional)
```json
{
  "tone_preference": "casual",
  "notification_email": true,
  "notification_slack": true,
  "urgency_threshold": 8
}
```

**Response `200 OK`** — updated settings object.

---

#### `GET /settings/profile`

Get the user's profile information.

**Response `200 OK`** — user profile object (see `GET /auth/me`).

---

#### `PUT /settings/profile`

Update profile information.

**Request Body** (all fields optional)
```json
{
  "name": "Jane Smith",
  "company_description": "We build SaaS tools for distributed teams."
}
```

**Response `200 OK`** — updated profile object.

---

### Billing

#### `GET /billing/status`

Get the current subscription status.

**Response `200 OK`**
```json
{
  "plan": "pro",
  "status": "active",
  "current_period_end": "2026-04-14T00:00:00Z",
  "cancel_at_period_end": false,
  "stripe_customer_id": "cus_abc123"
}
```

---

#### `POST /billing/checkout`

Create a Stripe Checkout session to upgrade or subscribe.

**Request Body**
```json
{ "price_id": "price_your_pro_price_id" }
```

**Response `200 OK`**
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_..."
}
```

---

#### `GET /billing/portal`

Create a Stripe Customer Portal session for managing the subscription (cancel, update payment method, view invoices).

**Response `200 OK`**
```json
{ "portal_url": "https://billing.stripe.com/session/..." }
```

---

#### `POST /billing/webhook`

Stripe webhook handler. Processes events such as:

- `checkout.session.completed` — activates subscription
- `customer.subscription.updated` — updates plan/status
- `customer.subscription.deleted` — downgrades to free tier

> This endpoint is called by Stripe — do not call it directly. The Stripe signature header is verified using `STRIPE_WEBHOOK_SECRET`.

---

## Response Format

All successful responses return JSON. Paginated list endpoints use the following envelope:

```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 0
}
```

---

## Error Codes

| HTTP Status | Meaning                                                      |
|-------------|--------------------------------------------------------------|
| `200`       | Success                                                      |
| `201`       | Resource created                                             |
| `400`       | Bad request — invalid input or business logic error          |
| `401`       | Unauthorized — missing or invalid Bearer token               |
| `403`       | Forbidden — authenticated but not permitted                  |
| `404`       | Resource not found                                           |
| `409`       | Conflict — resource already exists (e.g. duplicate email)    |
| `422`       | Unprocessable Entity — request body failed validation        |
| `429`       | Too Many Requests — rate limit exceeded                      |
| `500`       | Internal Server Error — unexpected server-side failure       |

Error responses follow this structure:

```json
{
  "detail": "Human-readable error message"
}
```

---

## Rate Limits

| Tier    | Requests per minute | Emails processed per day |
|---------|---------------------|--------------------------|
| Free    | 30                  | 50                        |
| Pro     | 120                 | 500                       |
| Agency  | 600                 | 5,000                     |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1710414060
```

When the rate limit is exceeded, the API returns `429 Too Many Requests` with a `Retry-After` header indicating how many seconds to wait.
