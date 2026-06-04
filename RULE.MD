# Project Rules & Development Guidelines

> **NestJS E-Commerce API** — Authoritative rules for contributors, AI assistants (Copilot, Cursor, Claude), and code reviewers.
> Stack: NestJS 11 · TypeScript 5 · PostgreSQL 12+ · Prisma 7 · Passport-JWT · nestjs-i18n
>
> **AI Assistant Notice:** This file is the single source of truth for all project conventions. When Copilot, Cursor, or any AI tool generates or modifies code, it **must** follow every rule in this document. When the AI creates a new reusable utility, decorator, DTO, constant, type, or class that will be used in more than one place, it **must** place it in the correct location defined in Section 25 and **must** update the registry table in Section 25 immediately — before considering the task complete.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Versions](#2-tech-stack--versions)
3. [Repository Structure](#3-repository-structure)
4. [Environment & Configuration](#4-environment--configuration)
5. [Database & Prisma Rules](#5-database--prisma-rules)
6. [Module Architecture](#6-module-architecture)
7. [Naming Conventions](#7-naming-conventions)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [API Design & Controllers](#9-api-design--controllers)
10. [DTOs & Validation](#10-dtos--validation)
11. [Exception Handling](#11-exception-handling)
12. [Response Format](#12-response-format)
13. [Internationalization (i18n)](#13-internationalization-i18n)
14. [Pagination](#14-pagination)
15. [Logging & Morgan](#15-logging--morgan)
16. [Rate Limiting](#16-rate-limiting)
17. [File Uploads & S3](#17-file-uploads--s3)
18. [Email Service](#18-email-service)
18a. [WhatsApp Service](#18a-whatsapp-service)
19. [Google Maps Integration](#19-google-maps-integration)
20. [Code Quality & Formatting](#20-code-quality--formatting)
21. [Testing](#21-testing)
22. [Git & Commit Workflow](#22-git--commit-workflow)
23. [Security Rules](#23-security-rules)
24. [Adding a New Feature Module](#24-adding-a-new-feature-module)
25. [Reusable Code Registry](#25-reusable-code-registry)

---

## 1. Project Overview

This is a **modular, scalable NestJS REST API** for an e-commerce platform. It currently exposes:

| Domain   | Status | Notes                                                      |
| -------- | ------ | ---------------------------------------------------------- |
| Auth     | Active | JWT access + refresh tokens, email verify, OTP via WhatsApp |
| User     | Active | Registration, profile management, mobile OTP verification  |
| Address  | Active | Polymorphic addresses, geocoding, map pick                 |
| Category | Active | Hierarchical categories with icon support, admin-managed   |
| Product  | Active | Products, variants, attributes, slugs, category-linked     |

The application is a **JSON-only REST API**. No server-side rendering. Static files are served from `/static` (e.g., `Map.html` for the map picker UI).

---

## 2. Tech Stack & Versions

| Layer            | Technology                          | Version    |
| ---------------- | ----------------------------------- | ---------- |
| Framework        | NestJS                              | 11.0.1     |
| Runtime          | Node.js                             | ≥ 18       |
| Language         | TypeScript                          | 5.x        |
| Database         | PostgreSQL                          | ≥ 12       |
| ORM              | Prisma                              | 7.3.0      |
| Auth             | Passport + passport-jwt             | 11.x / 4.x |
| Token signing    | @nestjs/jwt                         | 11.x       |
| Validation       | class-validator + class-transformer | 0.14.x     |
| API docs         | @nestjs/swagger                     | 11.x       |
| i18n             | nestjs-i18n                         | 10.6.x     |
| Rate limiting    | @nestjs/throttler                   | 6.x        |
| HTTP logging     | Morgan                              | 1.10.x     |
| Email            | Nodemailer                          | 8.x        |
| Maps             | Google Maps Geocoding API           | —          |
| Object Storage   | AWS S3 SDK v3                       | 3.x        |
| Password hashing | bcrypt                              | 6.x        |
| Linting          | ESLint + typescript-eslint          | 9.x        |
| Formatting       | Prettier                            | 3.x        |
| Testing          | Jest + ts-jest                      | 30.x       |
| Pre-commit       | Husky + lint-staged                 | 9.x / 16.x |

**Never downgrade a dependency without a team discussion.** Pin major versions in `package.json` using `^` (minor/patch upgrades allowed, major blocked).

---

## 3. Repository Structure

```
src/
├── app.controller.ts          # Health-check / root endpoints only
├── app.module.ts              # Root module — global config wired here
├── app.service.ts             # Root service
├── main.ts                    # Bootstrap — Swagger, pipes, guards, CORS
│
├── common/                    # Shared, domain-agnostic code
│   ├── common.module.ts       # Exports DatabaseService, MailService, etc.
│   ├── config/
│   │   ├── database/          # PrismaClient wrapper (DatabaseService)
│   │   ├── google-map/        # GoogleMapsService
│   │   ├── mail/              # MailService + templates
│   │   ├── morgan/            # HTTP logging configuration
│   │   ├── redis/             # RedisService (OTP cache, ephemeral KV store)
│   │   ├── s3/                # S3AwsService + FileValidationPipe
│   │   └── whatsapp/          # WhatsAppService + providers + templates
│   ├── dto/                   # Shared DTOs: PaginationDto, ResponseDto, etc.
│   ├── exceptions/            # AppException hierarchy
│   ├── helpers/
│   │   ├── constant/          # Shared constants (regex, etc.)
│   │   ├── filters/           # HttpExceptionFilter
│   │   ├── interceptors/      # ResponseInterceptor
│   │   └── validation/        # RequiredString decorator
│   └── i18n/
│       ├── en/                # English translation JSON files
│       └── hi/                # Hindi translation JSON files
│
├── database/
│   └── seeders/               # Prisma seed scripts
│
└── module/                    # Feature modules (one folder per domain)
    ├── auth/
    ├── user/
    ├── address/
    ├── category/
    └── product/

prisma/
├── schema.prisma              # Single source of truth for data models
└── migrations/                # Never edit manually

static/                        # Served at /static — Map.html lives here
test/                          # E2E tests
```

**Rules:**

- All feature code lives under `src/module/<domain>/`.
- All shared utilities live under `src/common/`.
- Never import a feature module from another feature module directly. Go through a shared service or a dedicated shared module.
- `common/` must stay domain-agnostic — no business logic, no references to `module/`.

---

## 4. Environment & Configuration

### Required Variables

All variables are validated at startup via **Joi** in `app.module.ts`. The app **will not start** if any required variable is missing.

```env
# Core
NODE_ENV=development           # development | production | test
PORT=8080
APP_URL=http://localhost:8080
ENABLE_SWAGGER=true            # "true" | "false"
FALLBACK_LANGUAGE=en
CORS_ORIGINS=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/db_name

# JWT — use long random secrets (≥ 32 chars) in production
JWT_ACCESS_SECRET_TOKEN=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET_TOKEN=...
JWT_REFRESH_EXPIRES_IN=7d
JWT_VERIFICATION_SECRET_TOKEN=...

# Rate Limiting
RATE_LIMIT_TTL=60              # seconds
RATE_LIMIT_LIMIT=100           # requests per TTL window

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false              # "true" for port 465
SMTP_USER=your@email.com
SMTP_PASS=app_password
MAIL_FROM_NAME=E-Commerce API

# Google Maps
GOOGLE_MAPS_API_KEY=...
GOOGLE_MAPS_GEOCODING_BASE_URL=https://maps.googleapis.com/maps/api/geocode/json

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=...

# Redis
REDIS_URL=redis://localhost:6379

# WhatsApp (Baileys provider)
WHATSAPP_PROVIDER=baileys              # currently only 'baileys' is supported
# Morgan HTTP Logging
ENABLE_HTTP_LOGGING=true
HTTP_LOG_FORMAT=auto           # auto | dev | combined | short | tiny | custom
LOG_ERRORS_ONLY=false          # true in production to reduce noise
ENABLE_SECURITY_LOGGING=true
# HTTP_LOG_FILE_PATH=./logs/http.log   # optional file output
```

### Configuration Rules

- Copy `.env.example` → `.env` and fill in real values. **Never commit `.env`.**
- Add every new env variable to `.env.example` with a placeholder value and a comment.
- Add the corresponding Joi validation to `app.module.ts` immediately — required fields use `.required()`, optional fields use `.optional()` or `.default(value)`.
- Use `configService.getOrThrow<T>('KEY')` when the value is mandatory at runtime. Use `configService.get<T>('KEY')` with a fallback for optional values.
- Never hardcode secrets, API keys, or URLs in source code.

---

## 5. Database & Prisma Rules

### Schema (`prisma/schema.prisma`)

- **One schema file** — all models live here.
- Use **`snake_case`** for all DB column names via `@map()`. Prisma model fields are `camelCase`.
- All tables use `@map("table_name")` to enforce `snake_case` table names.
- Every model **must** have: `id` (UUID, `@default(uuid())`), `createdAt`, `updatedAt`, `deletedAt` (for soft-deleteable entities).
- Use `@db.Uuid` for all UUID columns.
- Use `@db.VarChar(n)` for all string columns — do not use unbounded `String` in production models.
- Add `@@index` decorators for any column used in `WHERE`, `ORDER BY`, or `JOIN` clauses.

### Soft Deletes

- **All user-facing entities use soft delete** (`deletedAt DateTime? @map("deleted_at")`).
- Active record convention: `deletedAt IS NULL` = active.
- Never add a separate `isActive` flag alongside `deletedAt` — they express the same thing.
- All repository queries must filter `deletedAt: null` by default.

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name describe_what_changed

# Apply migrations in production
npx prisma migrate deploy

# Reset dev database (destructive)
npx prisma migrate reset
```

- **Never edit a migration file after it has been committed.**
- Migration names must be descriptive: `add_mobile_to_users`, not `migration1`.
- After changing `schema.prisma`, always run `npx prisma generate` to regenerate the client.
- Seed data runs via `npm run prisma:seed`. Seeders live in `src/database/seeders/`.

### DatabaseService (Prisma Wrapper)

- All database access goes through `DatabaseService` (extends `PrismaClient`), injected from `CommonModule`.
- Never instantiate `PrismaClient` directly in a feature module.
- The repository layer owns all database calls — services must not call `databaseService` directly.

### 3NF & Denormalization Policy

- Follow 3NF by default.
- **Documented exceptions are allowed** when a performance benefit is clear and the denormalized column is immutable after insert (e.g., `countryId` on `City` to avoid join for country-level city filters). Every such exception must be documented in a schema comment on the model.

---

## 6. Module Architecture

Each feature module follows this strict layered pattern:

```
module/<domain>/
├── <domain>.module.ts       # NestJS module — wires everything together
├── <domain>.controller.ts   # HTTP layer — routes, guards, Swagger decorators
├── <domain>.service.ts      # Business logic — no direct DB calls
├── <domain>.repository.ts   # Data access — all Prisma queries live here
└── dto/
    ├── create-<domain>.dto.ts
    ├── update-<domain>.dto.ts
    └── ...
```

**Rules:**

- **Controller** → only handles HTTP. Calls service methods. No business logic.
- **Service** → orchestrates business logic. Calls repository methods. Throws domain exceptions.
- **Repository** → only talks to `DatabaseService`. No business logic. Returns raw Prisma results or plain objects.
- A repository must **never** call another repository directly. If cross-domain data is needed, the service fetches it from both repositories.
- A service must **never** import another feature module's service unless it is explicitly exported and the dependency is intentional (e.g., `AuthService` using `UserRepository`).

---

## 7. Naming Conventions

| Artifact             | Convention                                  | Example                           |
| -------------------- | ------------------------------------------- | --------------------------------- |
| Files                | `kebab-case`                                | `user.service.ts`                 |
| Classes              | `PascalCase`                                | `UserService`                     |
| Interfaces/Types     | `PascalCase`                                | `AuthenticatedUser`               |
| Variables/functions  | `camelCase`                                 | `getUserById`                     |
| Constants            | `SCREAMING_SNAKE_CASE`                      | `AUTH_CONFIG`                     |
| Enums                | `PascalCase` (name), `UPPER_SNAKE` (values) | `UserRole.ADMIN`                  |
| DB columns           | `snake_case`                                | `password_hash`                   |
| Prisma model fields  | `camelCase`                                 | `passwordHash`                    |
| DTO class names      | `<Action><Domain>Dto`                       | `CreateAddressDto`                |
| Guard class names    | `<Name>Guard`                               | `JwtAuthGuard`                    |
| Strategy class names | `<Name>Strategy`                            | `JwtStrategy`                     |
| Decorator names      | `PascalCase` function                       | `@CurrentUser()`, `@Roles()`      |
| i18n keys            | `dot.notation`                              | `user.verification.invalid_token` |
| HTTP endpoints       | `kebab-case` plural                         | `/auth/refresh-token`             |

---

## 8. Authentication & Authorization

### Token System

The app uses **two JWT tokens**:

| Token         | Strategy name       | Cookie name     | Expiry | Secret env var             |
| ------------- | ------------------- | --------------- | ------ | -------------------------- |
| Access Token  | `jwt`               | `access_token`  | 15m    | `JWT_ACCESS_SECRET_TOKEN`  |
| Refresh Token | `JWT-refresh-token` | `refresh_token` | 7d     | `JWT_REFRESH_SECRET_TOKEN` |

- Email verification uses a third JWT signed with `JWT_VERIFICATION_SECRET_TOKEN`, expiry 24h.
- Token rotation is implemented via `tokenVersion` on the `User` model. Incrementing `tokenVersion` invalidates all existing refresh tokens for that user (logout, password change).

### Token Extraction

Tokens are extracted from (in priority order):

1. **Cookie** (`access_token` / `refresh_token`)
2. **Authorization: Bearer** header

This is implemented in `accessTokenExtractor` and `jwtExtractor`. Never change the extraction order without updating both strategies.

### Guards

| Guard         | Class             | Usage                                                            |
| ------------- | ----------------- | ---------------------------------------------------------------- |
| Access token  | `JwtAuthGuard`    | `@UseGuards(JwtAuthGuard)`                                       |
| Refresh token | `JwtRefreshGuard` | `@UseGuards(JwtRefreshGuard)`                                    |
| Role-based    | `RoleGuard`       | `@UseGuards(JwtAuthGuard, RoleGuard)` + `@Roles(UserRole.ADMIN)` |

- Apply `JwtAuthGuard` globally (or per-controller) and use `@Public()` to opt out for public endpoints.
- `RoleGuard` must always be used **together with** `JwtAuthGuard`, never standalone.
- `ThrottlerGuard` is applied globally via `APP_GUARD` in `AppModule`.

### Decorators

- `@CurrentUser()` — extracts the full `AuthenticatedUser` from `request.user`.
- `@CurrentUser('userId')` — extracts a specific field.
- `@Public()` — marks an endpoint as unauthenticated.
- `@Roles(UserRole.ADMIN)` — restricts to one or more roles.

### User Roles

```typescript
enum UserRole {
  ADMIN    // Full platform access
  USER     // Standard customer
  SELLER   // Merchant / vendor
}
```

### Password Rules

- Passwords are hashed with **bcrypt**, `BCRYPT_ROUNDS = 10`.
- Never store plaintext passwords. Never log passwords.
- Minimum password length is enforced in the DTO (`RequiredString('Password', 8)`).

---

## 9. API Design & Controllers

### URL Conventions

- Use `kebab-case` for all URL segments: `/refresh-token`, `/verify-email`.
- Use plural nouns for resource collections: `/addresses`, `/products`.
- Use `/:id` for single-resource operations.
- Prefix all authenticated routes with their domain: `/auth/...`, `/user/...`, `/address/...`.

### HTTP Methods

| Action           | Method   | Example                    |
| ---------------- | -------- | -------------------------- |
| List (paginated) | `GET`    | `GET /addresses`           |
| Get single       | `GET`    | `GET /addresses/:id`       |
| Create           | `POST`   | `POST /addresses`          |
| Full update      | `PUT`    | `PUT /addresses/:id`       |
| Partial update   | `PATCH`  | `PATCH /addresses/:id`     |
| Delete           | `DELETE` | `DELETE /addresses/:id`    |
| Action/RPC       | `POST`   | `POST /auth/refresh-token` |

### Swagger Decorators (Required on Every Endpoint)

Every controller method must have:

```typescript
@ApiTags('Domain Name')          // on the controller class
@ApiOperation({ summary: '...' }) // on every method
@ApiOkResponse({ description: '...' })
@ApiUnauthorizedResponse({ description: '...' })  // if protected
@ApiBearerAuth()                  // if protected
```

Swagger is enabled/disabled via `ENABLE_SWAGGER=true|false`. Never commit with Swagger disabled.

### Response Codes

- `200 OK` — successful GET, POST (actions), PUT, PATCH.
- `201 Created` — successful resource creation.
- `400 Bad Request` — validation errors, business logic violations.
- `401 Unauthorized` — missing or invalid token.
- `403 Forbidden` — authenticated but insufficient role.
- `404 Not Found` — resource does not exist.
- `409 Conflict` — duplicate resource (email already registered, etc.).
- `429 Too Many Requests` — rate limit exceeded.
- `500 Internal Server Error` — unexpected server failure.

Use `@HttpCode(HttpStatus.OK)` explicitly when a `POST` should return 200 instead of 201.

---

## 10. DTOs & Validation

### General Rules

- Every request body and query parameter must be typed with a DTO class.
- All DTOs use **class-validator** decorators for validation.
- Use the custom `@RequiredString(field, minLength, maxLength?)` decorator for mandatory string fields — it composes `@IsNotEmpty`, `@IsString`, `@MinLength`, `@MaxLength` with i18n-aware messages.
- Validation errors are i18n-translated via `i18nValidationMessage('validation.key', { field: '...' })`.
- All DTOs must have full `@ApiProperty()` decorators for Swagger documentation.

### DTO Structure Example

```typescript
export class CreateFooDto {
  @ApiProperty({
    description: '...',
    example: '...',
    type: String,
    required: true,
  })
  @RequiredString('Field Name', 2, 100)
  name: string;

  @ApiProperty({ description: '...', example: 'foo@bar.com', required: true })
  @RequiredString('Email', 5, 50)
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('validation.invalid', { field: 'Email' }),
    },
  )
  email: string;
}
```

### Update DTOs

- Use `PartialType(CreateFooDto)` from `@nestjs/swagger` to make all fields optional for PATCH endpoints.
- Never duplicate field definitions between Create and Update DTOs.

### Pagination DTO

Use `PaginationDto` (from `src/common/dto/pagination.dto.ts`) for all list endpoints. It provides `page` and `limit` with validation and defaults.

---

## 11. Exception Handling

### Exception Hierarchy

```
HttpException (NestJS)
└── AppException          # Base custom exception (carries errorCode)
    ├── BusinessException # HTTP 400 — business logic violations
    ├── ConflictException # HTTP 409 — duplicate resources
    └── NotFoundException # HTTP 404 — resource not found
```

### Rules

- Always throw a typed custom exception, never a raw `Error` or `new HttpException(...)`.
- Use `NotFoundException` when a record is not found.
- Use `ConflictException` when a unique constraint would be violated (check before insert).
- Use `BusinessException` for all other business rule violations (invalid state, forbidden action, etc.).
- Provide a meaningful `errorCode` string (e.g., `'USER_NOT_FOUND'`, `'EMAIL_ALREADY_EXISTS'`) — these are used by frontends for error mapping.
- Exception messages must be i18n keys resolved via `i18nService.t('...')`.

### Global Exception Filter

`HttpExceptionFilter` (registered globally) catches **all** exceptions and returns a consistent error envelope:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "timestamp": "2026-04-23T10:00:00.000Z",
  "path": "/user/123",
  "errors": ["field-level validation error 1"] // only for validation failures
}
```

- `5xx` errors are logged as `Logger.error` with stack trace.
- `4xx` errors are logged as `Logger.warn`.
- Never swallow exceptions in a service — let them propagate to the filter.

---

## 12. Response Format

All successful responses are wrapped by `ResponseInterceptor`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request successful",
  "data": { ... },
  "timestamp": "2026-04-23T10:00:00.000Z",
  "path": "/auth/profile"
}
```

### Rules

- To set a custom message, return `{ message: 'Custom message', data: payload }` from your service/controller.
- If you return a plain object, it becomes `data` and `message` defaults to `"Request successful"`.
- For paginated responses, use `PaginatedResponseDto` as the `data` value — it includes `items` and `meta`.
- Never return `null` as `data` for a successful response. Return an empty array `[]` or an empty object `{}`.

---

## 13. Internationalization (i18n)

The app supports **English (`en`)** and **Hindi (`hi`)**. Language is resolved in this order:

1. `?lang=` query parameter
2. `Accept-Language` header
3. `x-lang` header
4. Fallback: `FALLBACK_LANGUAGE` env var (default `en`)

### Translation File Locations

```
src/common/i18n/
├── en/
│   ├── address.json
│   ├── category.json
│   ├── common.json
│   ├── product.json
│   ├── user.json
│   └── validation.json
└── hi/
    ├── address.json
    ├── category.json
    ├── common.json
    ├── product.json
    ├── user.json
    └── validation.json
```

### Rules

- Every user-visible string (error messages, email subjects, success messages) must be in the i18n files.
- Never hardcode English strings in services or controllers.
- Both `en` and `hi` translation files must be updated together — a missing key in one language is a bug.
- Keys use dot notation grouped by domain: `user.not_found`, `address.city_not_found`, `validation.required`.
- In services, inject `I18nService` and call `this.i18nService.t('key')`.
- In DTO validators, use `i18nValidationMessage('validation.key', { field: 'FieldName' })`.

---

## 14. Pagination

All list endpoints that can return more than one item must support pagination.

### Request

Use `PaginationDto` as `@Query()`:

```typescript
@Get()
async list(@Query() pagination: PaginationDto) { ... }
```

### Response

Return `PaginatedResponseDto<T>`:

```json
{
  "items": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 47,
    "totalPages": 5,
    "itemsOnCurrentPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Repository Pattern for Pagination

Repositories must return `{ data: T[], totalItems: number }`. Services build the `PaginationMetaDto` using the `buildMeta` helper and wrap with `PaginatedResponseDto`.

---

## 15. Logging & Morgan

HTTP request logging is handled by **Morgan**, configured in `src/common/config/morgan/`.

| `HTTP_LOG_FORMAT` | Behavior                                              |
| ----------------- | ----------------------------------------------------- |
| `auto` (default)  | `dev` format in development, `combined` in production |
| `dev`             | Colored short output                                  |
| `combined`        | Standard Apache combined log format                   |
| `short`           | Shorter than combined, includes response time         |
| `tiny`            | Minimal output                                        |
| `custom`          | Custom format defined in `morgan.config.ts`           |

**Security logging** (when `ENABLE_SECURITY_LOGGING=true`) logs authentication routes and error responses with extra detail.

**Application logging** uses NestJS's built-in `Logger`. Use it in every class:

```typescript
private readonly logger = new Logger(MyClassName.name);
```

- Use `logger.log()` for informational events.
- Use `logger.warn()` for 4xx-class issues.
- Use `logger.error(message, stack)` for 5xx-class issues.
- Never log sensitive data (passwords, tokens, PII).

---

## 16. Rate Limiting

`ThrottlerGuard` is applied **globally** as `APP_GUARD`. Default: **100 requests per 60 seconds** per IP.

To skip rate limiting on a specific endpoint (e.g., health check):

```typescript
@SkipThrottle()
@Get('health')
health() { ... }
```

Custom limits per endpoint:

```typescript
@Throttle({ default: { limit: 5, ttl: 60 } })
@Post('login')
login() { ... }
```

Adjust defaults via `RATE_LIMIT_TTL` and `RATE_LIMIT_LIMIT` env vars.

---

## 17. File Uploads & S3

The S3 integration lives in `src/common/config/s3/`. It is currently scaffolded but not fully implemented.

### Rules (when implementing)

- Use `FileValidationPipe` to validate file type and size before upload.
- Never store raw file bytes in the database — store only the S3 key/URL.
- Use pre-signed URLs for secure, time-limited client downloads.
- Scope S3 keys by entity type: `users/{userId}/avatar.jpg`, `products/{productId}/image-1.jpg`.
- File size and type limits must be configurable via env vars.

---

## 18. Email Service

`MailService` (in `src/common/config/mail/`) wraps Nodemailer.

### Templates

Email HTML templates live in `mail.template.ts`. Templates are TypeScript functions that return HTML strings — no separate templating engine.

### Rules

- All email sending is async — never `await` in a fire-and-forget context without error handling.
- Use transactional email for: email verification, password reset, order confirmations.
- Email subjects and body text must use i18n strings.
- Test SMTP configuration locally with a tool like Mailtrap or Ethereal before committing.
- Never send real emails during testing — mock `MailService` in test modules.

---

## 18a. WhatsApp Service

`WhatsAppService` (in `src/common/config/whatsapp/`) provides WhatsApp messaging via a pluggable provider architecture. The current provider is **Baileys** (open-source WhatsApp Web library).

### Provider Architecture

```
whatsapp/
├── whatsapp.service.ts           # Single entry point — inject this
├── whatsapp.template.ts          # Message templates (TypeScript functions)
├── whatsapp.module.ts
├── index.ts                      # Barrel export
├── interfaces/
│   └── whatsapp-provider.interface.ts  # IWhatsAppProvider contract
└── providers/
    ├── baileys.provider.ts             # Baileys implementation
    └── whatsapp-provider.factory.ts    # Reads WHATSAPP_PROVIDER and creates instance
```

To add a new provider: implement `IWhatsAppProvider`, register it in `WhatsAppProviderFactory`. Zero changes to callers.

### Available `WhatsAppService` Methods

| Method                          | Description                                      |
| ------------------------------- | ------------------------------------------------ |
| `sendOtp(mobile, otp)`          | Sends a numeric OTP via WhatsApp.                |
| `sendMobileVerifiedMessage(mobile, name)` | Confirms mobile verification success.  |
| `sendEmailVerifiedMessage(mobile, name)`  | Confirms email verification success.   |
| `sendWelcomeMessage(mobile, name)`        | Sends onboarding welcome message.      |
| `sendOrderPlacedNotification(mobile, orderId, total)` | Order confirmation.      |
| `sendOrderShippedNotification(mobile, ...)`           | Shipping update.         |

### Rules

- Always call `WhatsAppService` from the **service layer** — never from a controller or repository.
- Phone numbers must be in **E.164 format** (`+91XXXXXXXXXX`). Enforce this in DTOs with `REGEX.MOBILE`.
- The Baileys session state is persisted in the database (table `WhatsappAuthState`). Do not store it in the filesystem.
- On first startup with a fresh session, a QR code is printed to stdout — scan it once to authenticate. After that, the session auto-reconnects.
- Message templates live in `whatsapp.template.ts` — never inline message strings in services.
- Never expose the raw `WhatsAppSendResult` object to API clients.
- `WHATSAPP_PROVIDER` is optional — if omitted, it defaults to `'baileys'`.

---

`GoogleMapsService` provides geocoding (address → coordinates) via the Google Geocoding API.

### Address Flow

1. **Preview** — geocodes an address, returns coordinates + a Google Maps URL. Nothing is saved.
2. **Save** — persists the address with coordinates to the database.
3. **Save from Map** — user picks a pin on `Map.html`; coordinates are sent directly, reverse-geocoded for the display address.

### Rules

- Always call `GoogleMapsService` from the **service layer**, never from a controller or repository.
- Handle API failures gracefully — if geocoding fails, fall back to city-level coordinates from the database.
- Never expose the raw Google API response to clients.
- `GOOGLE_MAPS_API_KEY` must be restricted in production (HTTP referrer or IP restriction in GCP console).

---

## 20. Code Quality & Formatting

### ESLint

Configuration is in `eslint.config.mjs`. Run:

```bash
npm run lint           # check and auto-fix
```

Key rules enforced:

- No `any` type without explicit suppression comment.
- No unused variables.
- Consistent import ordering.
- No floating promises (async calls must be awaited or `.catch()` handled).

### Prettier

Configuration is in `.prettierrc`. Run:

```bash
npm run format         # format all src/ and test/ files
```

Prettier runs automatically on staged files via `lint-staged` (Husky pre-commit hook).

### TypeScript

- `strict: true` is enabled in `tsconfig.json`.
- No implicit `any`.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- All public service methods must have explicit return type annotations.
- Use `readonly` on class properties that are injected via constructor and not reassigned.

### General Code Rules

- No `console.log` in committed code — use NestJS `Logger`.
- No commented-out code blocks.
- Functions longer than ~50 lines should be refactored.
- No magic numbers — define named constants.
- Import from barrel `index.ts` files when available (e.g., `from 'src/common'`).

---

## 21. Testing

### Unit Tests

- Co-located with source: `<file>.spec.ts` next to `<file>.ts`.
- Use `@nestjs/testing` `Test.createTestingModule()` to wire up modules.
- Mock all external dependencies (database, mail, S3, Google Maps) using Jest mocks.
- Follow **AAA** pattern: Arrange → Act → Assert.

### E2E Tests

- Live in `test/` as `*.e2e-spec.ts`.
- Use a dedicated test database (`NODE_ENV=test`).
- Run with: `npm run test:e2e`

### Coverage

```bash
npm run test:cov
```

Target minimum coverage: **80%** for services and repositories.

### Mocking Rules

- Never hit a real database, real SMTP server, or real external API in unit tests.
- Create a `MockDatabaseService` or use `jest.spyOn` on the repository.
- Seed test data explicitly in each test — do not depend on order of test execution.

---

## 22. Git & Commit Workflow

### Branch Naming

```
feature/<ticket-id>-short-description
fix/<ticket-id>-short-description
chore/short-description
refactor/short-description
```

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short description>

feat(auth): add refresh token rotation
fix(address): handle missing cityId gracefully
chore(deps): upgrade Prisma to 7.3.0
refactor(user): extract password hashing to helper
test(auth): add unit tests for JwtStrategy
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`.

### Pre-commit Hook

Husky runs `lint-staged` before every commit:

- `*.ts` files → `eslint --fix` then `prettier --write`
- `*.json`, `*.md` files → `prettier --write`

Do not skip the hook (`--no-verify`) except in emergencies.

### Pull Request Rules

- Every PR must pass `npm run lint` and `npm run test` in CI.
- No PR merges with failing tests.
- Migrations in a PR must include a rollback strategy note in the PR description.
- Breaking API changes require a version note and consumer notification.

---

## 23. Security Rules

- **JWT secrets** must be at least 32 characters of random entropy in production. Use `openssl rand -hex 32`.
- **Bcrypt rounds** are set to 10 (`AUTH_CONFIG.BCRYPT_ROUNDS`). Do not lower this.
- **Token invalidation** — logout increments `tokenVersion`, invalidating all refresh tokens. Implement the same for password change.
- **CORS** — set `CORS_ORIGINS` to specific origins in production. Never use `*` in production.
- **Input validation** — all inputs validated with class-validator DTOs before reaching the service layer. Never trust raw request body.
- **SQL injection** — Prisma parameterizes all queries. Never use `$queryRawUnsafe` with user input.
- **Sensitive fields** — never return `passwordHash`, `tokenVersion`, or raw JWT payloads in API responses. Use explicit select projections in repositories.
- **Rate limiting** — login and registration endpoints should have tighter limits than defaults (`@Throttle({ default: { limit: 5, ttl: 60 } })`).
- **Environment validation** — `app.module.ts` validates all required env vars at startup, preventing misconfigured deployments.
- **No debug info in production** — Swagger is disabled via `ENABLE_SWAGGER=false`. Stack traces are not exposed in error responses.

---

## 24. Adding a New Feature Module

Follow this checklist when building a new domain (e.g., `Order`):

1. **Create the folder**: `src/module/order/`

2. **Generate files**:

   ```
   order.module.ts
   order.controller.ts
   order.service.ts
   order.repository.ts
   dto/create-order.dto.ts
   dto/update-order.dto.ts
   ```

3. **Update Prisma schema**: Add the `Order` model to `prisma/schema.prisma` following the schema rules (UUID id, snake_case columns, soft delete, proper indexes).

4. **Create and apply migration**:

   ```bash
   npx prisma migrate dev --name add_order_table
   npx prisma generate
   ```

5. **Add i18n keys**: Add `order.json` to both `en/` and `hi/` translation folders.

6. **Register in AppModule**: Import `OrderModule` in `src/app.module.ts`.

7. **Wire the module**:
   - Repository injects `DatabaseService` from `CommonModule`.
   - Service injects repository (and other services if needed).
   - Controller injects service.
   - Module imports `CommonModule` (for `DatabaseService`).

8. **Apply guards**: Use `@UseGuards(JwtAuthGuard)` on the controller class (or individual methods). Add `@Roles(...)` where role restriction is needed.

9. **Add Swagger decorators**: Every controller method needs `@ApiOperation`, `@ApiOkResponse`, `@ApiBearerAuth()`, and relevant error response decorators.

10. **Write unit tests**: Cover all service methods with mocked repository. Target 80%+ coverage.

11. **Update `.env.example`**: If the new module needs new env vars, add them with placeholders and Joi validation.

---

---

## 25. Reusable Code Registry

This section is the **living registry of every reusable utility, decorator, DTO, constant, type, guard, interceptor, filter, and class** in the project. Its purpose is twofold:

1. **Discoverability** — before writing anything new, check here first. If it already exists, use it.
2. **Enforcement** — every AI tool (Copilot, Cursor, Claude) and every developer **must** add a row to the relevant table below whenever they create something reusable. This is not optional.

### AI Assistant Rule (Mandatory)

> When Copilot, Cursor, or any other AI assistant creates a new reusable artifact — a utility function, decorator, DTO base class, constant, type, exception class, guard, interceptor, pipe, or filter — it must:
>
> 1. Place the file in the correct directory as specified in the tables below.
> 2. Export it from the nearest `index.ts` barrel file.
> 3. Add a row to the matching table in this section **in the same response/commit** that introduces the code.
> 4. Never duplicate something that already exists in this registry.

---

### 25.1 Validation Decorators

Location: `src/common/helpers/validation/`
Barrel export: `src/common/helpers/index.ts`

| Name              | Signature                                                               | File                            | Description                                                                                                                |
| ----------------- | ----------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@RequiredString` | `RequiredString(field: string, minLength?: number, maxLength?: number)` | `required-string.validation.ts` | Composes `@IsNotEmpty`, `@IsString`, `@MinLength`, `@MaxLength` with i18n messages. Use on any mandatory string DTO field. |

---

### 25.1a Pipes

Location: `src/common/config/s3/`

| Name                 | Signature                                                                | File                      | Description                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FileValidationPipe` | `new FileValidationPipe({ allowedMimeTypes, maxSizeBytes?, required? })` | `file-validation.pipe.ts` | Validates uploaded files for MIME type and size. Pass as argument to `@UploadedFile()`. Never do manual file validation in a controller or service. |

---

### 25.2 Parameter Decorators

Location: `src/module/auth/decorator/`

| Name           | Signature                     | File                        | Description                                                                                      |
| -------------- | ----------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `@CurrentUser` | `CurrentUser(field?: string)` | `current-user.decorator.ts` | Extracts `request.user` or a specific field from it. Use in any authenticated controller method. |
| `@Public`      | `Public()`                    | `public.decorator.ts`       | Marks an endpoint as unauthenticated, bypassing `JwtAuthGuard`.                                  |
| `@Roles`       | `Roles(...roles: UserRole[])` | `role.decorator.ts`         | Restricts an endpoint to one or more `UserRole` values. Must be paired with `RoleGuard`.         |

---

### 25.3 Guards

Location: `src/module/auth/guards/`
Exported from: `src/module/auth/auth.module.ts`

| Name              | Class             | File                     | Description                                                                            |
| ----------------- | ----------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `JwtAuthGuard`    | `JwtAuthGuard`    | `access-token.guard.ts`  | Validates access JWT. Respects `@Public()`. Apply at controller class or method level. |
| `JwtRefreshGuard` | `JwtRefreshGuard` | `refresh-token.guard.ts` | Validates refresh JWT. Use only on the `POST /auth/refresh-token` endpoint.            |
| `RoleGuard`       | `RoleGuard`       | `role.guard.ts`          | Role-based access control. Always used together with `JwtAuthGuard`.                   |

---

### 25.4 Interceptors

Location: `src/common/helpers/interceptors/`

| Name                  | Class                    | File                      | Description                                                                                                       |
| --------------------- | ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ResponseInterceptor` | `ResponseInterceptor<T>` | `response.interceptor.ts` | Wraps all successful responses in `{ success, statusCode, message, data, timestamp, path }`. Registered globally. |

---

### 25.5 Exception Filter

Location: `src/common/helpers/filters/`

| Name                  | Class                 | File                       | Description                                                                                                                                                                                  |
| --------------------- | --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HttpExceptionFilter` | `HttpExceptionFilter` | `http-exception.filter.ts` | Global catch-all filter. Normalizes all errors into `{ success: false, statusCode, message, timestamp, path, errors? }`. Handles i18n validation messages. Registered globally in `main.ts`. |

---

### 25.6 Custom Exception Classes

Location: `src/common/exceptions/`
Barrel export: `src/common/exceptions/index.ts`

| Name                | HTTP Status  | Error Code Default      | File                     | When to Use                                          |
| ------------------- | ------------ | ----------------------- | ------------------------ | ---------------------------------------------------- |
| `AppException`      | Configurable | `INTERNAL_SERVER_ERROR` | `app.exception.ts`       | Base class only — do not throw directly.             |
| `BusinessException` | 400          | `BUSINESS_ERROR`        | `business.exception.ts`  | Business rule violations, invalid state transitions. |
| `ConflictException` | 409          | `CONFLICT`              | `conflict.exception.ts`  | Duplicate resources (email, unique fields).          |
| `NotFoundException` | 404          | `NOT_FOUND`             | `not-found.exception.ts` | Record does not exist or soft-deleted.               |

**Usage pattern:**

```typescript
throw new NotFoundException(
  this.i18nService.t('user.not_found'),
  'USER_NOT_FOUND',
);
```

---

### 25.7 Shared DTOs

Location: `src/common/dto/`
Barrel export: `src/common/dto/index.ts`

| Name                      | File                        | Description                                                                                                                                                |
| ------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PaginationDto`           | `pagination.dto.ts`         | Query DTO for paginated list endpoints. Provides `page` (default 1) and `limit` (default 10) with validation. Use as `@Query() pagination: PaginationDto`. |
| `PaginatedResponseDto<T>` | `paginated-response.dto.ts` | Response wrapper for paginated data. Contains `items: T[]` and `meta: PaginationMetaDto`.                                                                  |
| `PaginationMetaDto`       | `paginated-response.dto.ts` | Pagination metadata: `page`, `limit`, `totalItems`, `totalPages`, `itemsOnCurrentPage`, `hasNextPage`, `hasPreviousPage`.                                  |
| `ResponseDto<T>`          | `response.dto.ts`           | Typed wrapper for standard API responses (used for Swagger typing).                                                                                        |

---

### 25.8 Constants & Regex

Location: `src/common/helpers/constant/`

| Name             | File       | Description                                                                                                |
| ---------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `REGEX` (object) | `regex.ts` | Shared regular expressions. Add new regex patterns here — never inline regex literals in DTOs or services. |

Location: `src/module/auth/constants/`

| Name                   | File                | Description                                                                                                       |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `TokenType` (enum)     | `auth.constants.ts` | `EMAIL_VERIFICATION`, `PASSWORD_RESET` — type discriminator for JWT verification tokens.                          |
| `DEFAULT_TOKEN_EXPIRY` | `auth.constants.ts` | Default expiry values: `ACCESS = '15m'`, `REFRESH = '7d'`, `EMAIL_VERIFICATION = '24h'`, `PASSWORD_RESET = '1h'`. |
| `AUTH_CONFIG`          | `auth.constants.ts` | `BCRYPT_ROUNDS = 10`. Reference this instead of hardcoding the salt rounds.                                       |

Location: `src/common/config/s3/`

| Name                         | File                      | Description                                                                                                                                                         |
| ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FILE_LIMITS`                | `file-validation.pipe.ts` | Byte-size constants: `ONE_MB`, `TWO_MB`, `FIVE_MB`, `TEN_MB`, `FIFTY_MB`, `TWO_HUNDRED_MB`, `FIVE_HUNDRED_MB`. Use instead of magic numbers for size limits.        |
| `ALLOWED_IMAGE_TYPES`        | `file-validation.pipe.ts` | `['image/jpeg', 'image/png', 'image/webp', 'image/gif']` — use for any image upload endpoint.                                                                       |
| `ALLOWED_DOCUMENT_TYPES`     | `file-validation.pipe.ts` | `['application/pdf', 'application/msword', ...]` — use for document upload endpoints.                                                                               |
| `ALLOWED_VIDEO_TYPES`        | `file-validation.pipe.ts` | All accepted video formats: MP4, WebM, QuickTime, AVI, MPEG, OGG. Use when a transcoding pipeline is in place.                                                      |
| `ALLOWED_VIDEO_TYPES_STRICT` | `file-validation.pipe.ts` | `['video/mp4', 'video/webm']` only. Use when there is NO transcoding pipeline — these play natively in all browsers.                                                |
| `S3_FOLDERS`                 | `file-validation.pipe.ts` | Central folder-key templates for every entity type. Use `buildS3Folder()` to fill in the ID placeholder. Never hardcode S3 folder paths in services or controllers. |

---

### 25.8a Helper Functions

Location: `src/common/config/s3/`

| Name            | Signature                                                                  | File                      | Description                                                                                                                  |
| --------------- | -------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `buildS3Folder` | `buildS3Folder(template: string, placeholder: string, id: string): string` | `file-validation.pipe.ts` | Replaces `{placeholder}` in an `S3_FOLDERS` template with a real entity ID. Always use this instead of string concatenation. |

---

### 25.8b Helper Functions (Common)

Location: `src/common/helpers/`
Barrel export: `src/common/helpers/index.ts`

| Name                  | Signature                                                                                                                    | File           | Description                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `generateProductSlug` | `generateProductSlug(name: string): string`                                                                                  | `slug.util.ts` | Normalizes a product name into a URL-safe base slug.                                |
| `generateUniqueSlug`  | `generateUniqueSlug(base: string, existsFn: (candidate: string) => Promise<T \| null>, excludeId?: string): Promise<string>` | `slug.util.ts` | Appends numeric suffixes to avoid slug collisions. Use for product slug generation. |

---

### 25.9 TypeScript Types & Interfaces

Location: `src/module/auth/types/`

| Name                     | File            | Description                                                                                                                                   |
| ------------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `JwtAccessPayload`       | `auth.types.ts` | Shape of the decoded access JWT payload: `sub`, `email`, `role`.                                                                              |
| `JwtRefreshPayload`      | `auth.types.ts` | Shape of the decoded refresh JWT payload: `sub`, `version`.                                                                                   |
| `JwtVerificationPayload` | `auth.types.ts` | Shape of the email verification token payload: `userId`, `type`.                                                                              |
| `AuthenticatedUser`      | `auth.types.ts` | Shape of `request.user` after JWT validation: `userId`, `email`, `role`, `tokenVersion?`. Use as the type for `@CurrentUser()` return values. |

Location: `src/common/config/s3/`

| Name                    | File                      | Description                                                                                                                                                             |
| ----------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UploadResult`          | `s3.service.ts`           | Return type of `upload()` and `uploadLarge()`: `{ key, url, bucket, size, mimeType }`. Always store `key` in the database — never store the full URL, as it can change. |
| `PresignedUrlResult`    | `s3.service.ts`           | Return type of `getPresignedUrl()` and `getPresignedUploadUrl()`: `{ url, expiresInSeconds }`.                                                                          |
| `FileValidationOptions` | `file-validation.pipe.ts` | Config interface for `FileValidationPipe`: `{ allowedMimeTypes, maxSizeBytes?, required? }`.                                                                            |

---

### 25.10 Services (Shared / Infrastructure)

These services are provided by `CommonModule` and available to any feature module that imports it.

| Name                | File                                                  | Description                                                                                                                                                                                                                                                                |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DatabaseService`   | `src/common/config/database/database.service.ts`      | Prisma client wrapper. Inject this into every repository — never import `PrismaClient` directly.                                                                                                                                                                           |
| `MailService`       | `src/common/config/mail/mail.service.ts`              | Nodemailer wrapper. Provides `sendMail()` and template-based methods.                                                                                                                                                                                                      |
| `GoogleMapsService` | `src/common/config/google-map/google-maps.service.ts` | Geocoding and reverse-geocoding via Google Maps API.                                                                                                                                                                                                                       |
| `S3AwsService`      | `src/common/config/s3/s3.service.ts`                  | AWS S3 service. Methods: `upload()` (single-request, images/docs), `uploadLarge()` (multipart, always use for videos), `getPresignedUrl()`, `getPresignedUploadUrl()`, `delete()`, `deleteMany()`, `exists()`, `getPublicUrl()`, `buildKey()`. Inject from `CommonModule`. |
| `RedisService`      | `src/common/config/redis/redis.service.ts`            | ioredis wrapper. Methods: `set(key, value, ttlSeconds)`, `get(key)`, `del(key)`. Used for OTP caching and short-lived KV storage. Requires `REDIS_URL` env var. Inject from `CommonModule`.                                                                                |
| `WhatsAppService`   | `src/common/config/whatsapp/whatsapp.service.ts`      | WhatsApp messaging via pluggable provider (currently Baileys). See §18a for available methods and rules. Requires `WHATSAPP_PROVIDER` env var (defaults to `'baileys'`). Inject from `CommonModule`.                                                                        |

---

### 25.11 Mail Templates

Location: `src/common/config/mail/mail.template.ts`

All email HTML is defined as TypeScript functions in this file. Do not create separate template files.

| Function Name             | Signature                                         | Description                                                                                          |
| ------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `generateEmailTemplate`   | `generateEmailTemplate(subject, message): string` | Generic branded HTML email layout. Pass a subject string and an HTML message body. Used by all transactional emails (OTP, verification, etc.). |

---

### 25.12 Passport Strategies

Location: `src/module/auth/strategies/`

| Name              | Strategy ID           | File                        | Description                                                                                                                        |
| ----------------- | --------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `JwtStrategy`     | `'jwt'`               | `access-token.strategy.ts`  | Validates access tokens. Extracts from cookie first, then `Authorization: Bearer`. Attaches `AuthenticatedUser` to `request.user`. |
| `JWTRefreshToken` | `'JWT-refresh-token'` | `refresh-token.strategy.ts` | Validates refresh tokens. Same extraction order. Verifies `tokenVersion` against the database.                                     |

---

### 25.13 Token Extractor Functions

Location: `src/module/auth/strategies/`

These are exported standalone functions — reuse them if a custom strategy or middleware needs to extract tokens the same way.

| Name                   | File                        | Description                                                             |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `accessTokenExtractor` | `access-token.strategy.ts`  | Extracts access JWT: cookie → Bearer header. Returns `string \| null`.  |
| `jwtExtractor`         | `refresh-token.strategy.ts` | Extracts refresh JWT: cookie → Bearer header. Returns `string \| null`. |

---

### 25.14 WhatsApp Types & Interfaces

Location: `src/common/config/whatsapp/interfaces/whatsapp-provider.interface.ts`
Barrel export: `src/common/config/whatsapp/index.ts`

| Name                   | Kind        | Description                                                                                                   |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `WhatsAppMessage`      | Interface   | Payload for sending a message: `{ to: string (E.164), body: string }`.                                        |
| `WhatsAppSendResult`   | Interface   | Return value of `sendMessage()`: `{ messageId, to, provider, sentAt }`.                                       |
| `IWhatsAppProvider`    | Interface   | Contract all providers must implement: `providerName`, `initialize()`, `sendMessage()`, `destroy()`.           |
| `WhatsAppProviderName` | Type        | `'baileys'` — union of valid `WHATSAPP_PROVIDER` values. Extend this when adding a new provider.              |
| `WhatsAppTemplateName` | Type alias  | `keyof typeof whatsAppTemplates` — keyof the template map. Use to type template name parameters.              |

Location: `src/common/config/whatsapp/whatsapp.template.ts`

The `whatsAppTemplates` object contains the following template functions:

| Key                | Signature                                    | Description                             |
| ------------------ | -------------------------------------------- | --------------------------------------- |
| `otp`              | `(otp: string) => string`                    | OTP message body.                       |
| `mobileVerified`   | `(name: string) => string`                   | Mobile number verified confirmation.    |
| `emailVerified`    | `(name: string) => string`                   | Email address verified confirmation.    |
| `welcome`          | `(name: string) => string`                   | Onboarding welcome message.             |
| `orderPlaced`      | `(orderId: string, total: string) => string` | Order placed notification.              |
| `orderShipped`     | `(orderId: string, ...) => string`           | Order shipped notification.             |

**Rule:** All new WhatsApp message text must be added as a key in `whatsAppTemplates` — never inline strings in service methods.

---

### 25.15 OTP Helper

Location: `src/common/helpers/`
Barrel export: `src/common/helpers/index.ts`

| Name          | Signature                             | File             | Description                                                                                                      |
| ------------- | ------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `generateOtp` | `generateOtp(length?: number): string` | `otp.helper.ts` | Generates a cryptographically random numeric OTP of the given length (default 6). Uses `crypto.randomInt` — never use `Math.random()` for OTPs. |

OTP lifecycle (as implemented in `UserService`):

- Key prefix: `otp_register:<userId>`
- TTL: 15 minutes (`OTP_TTL_SECONDS = 900`)
- Storage: `RedisService.set()` / `RedisService.get()` / `RedisService.del()`
- Delivery: `WhatsAppService.sendOtp()`

---

When you (or an AI tool) create something reusable, follow these steps:

1. **Place the file** in the correct `src/common/` subfolder (or `auth/` for auth-specific things). If no subfolder fits, create one and document it here.
2. **Export it** from the nearest `index.ts` barrel.
3. **Add a row** to the correct table in this section. Include: name, file path (relative to `src/`), and a one-line description of when to use it.
4. **Commit the registry update** in the same commit as the new file.

If you are an AI assistant completing a task and you created something reusable, your response is **not complete** until you have updated this section.

---

_Last updated: June 2026 — keep this document in sync with the codebase._