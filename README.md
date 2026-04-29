# NestJS E-Commerce API

A modern, scalable e-commerce backend API built with NestJS, PostgreSQL, and Prisma.

## 📋 Tech Stack

| Component          | Technology        | Version               |
| ------------------ | ----------------- | --------------------- |
| **Framework**      | NestJS            | 11.0.1                |
| **Runtime**        | Node.js           | 18+                   |
| **Language**       | TypeScript        | 5.x                   |
| **Database**       | PostgreSQL        | 12+                   |
| **ORM**            | Prisma            | 7.3.0                 |
| **Authentication** | JWT (Passport)    | @nestjs/passport 11.x |
| **Validation**     | Class Validator   | 0.14.x                |
| **Logging**        | Morgan + Winston  | 1.11.x                |
| **Email**          | Nodemailer        | 6.9.x                 |
| **i18n**           | nestjs-i18n       | 10.4.x                |
| **Rate Limiting**  | @nestjs/throttler | 6.2.x                 |
| **Testing**        | Jest              | 30.x                  |

## 🚀 Setup

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Installation

1. **Clone repository**
   \`\`\`bash
   git clone <repository-url>
   cd nestjs-ecommerce
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure environment**
   \`\`\`bash
   cp .env.example .env

   # Edit .env with your configuration

   \`\`\`

4. **Setup database**
   \`\`\`bash
   npm run prisma:migrate
   npm run prisma:seed
   \`\`\`

5. **Start development server**
   \`\`\`bash
   npm run start:dev
   \`\`\`

## 📝 Environment Variables

### Core Configuration

\`\`\`env
NODE_ENV=development
PORT=8008
APP_URL=http://localhost:8008
ENABLE_SWAGGER=true
FALLBACK_LANGUAGE=en
\`\`\`

### Database

\`\`\`env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce-nest
\`\`\`

### JWT Authentication

\`\`\`env
JWT_ACCESS_SECRET_TOKEN=your-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET_TOKEN=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
JWT_VERIFICATION_SECRET_TOKEN=your-verification-secret-key
\`\`\`

### Email (SMTP)

\`\`\`env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=MyCompany
\`\`\`

### Google Maps API

\`\`\`env
GOOGLE_MAPS_API_KEY=your-api-key
GOOGLE_MAPS_GEOCODING_BASE_URL=https://maps.googleapis.com/maps/api/geocode/json
\`\`\`

### Rate Limiting

\`\`\`env
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
\`\`\`

### HTTP Logging (Morgan)

\`\`\`env
ENABLE_HTTP_LOGGING=true
HTTP_LOG_FORMAT=combined
LOG_ERRORS_ONLY=false
ENABLE_SECURITY_LOGGING=true
HTTP_LOG_FILE_PATH=./logs/http.log
\`\`\`

## 🗂️ Project Structure

\`\`\`
src/
├── app.controller.ts # Root controller
├── app.module.ts # Root module with global config
├── app.service.ts # Root service
├── main.ts # Application entry point
├── common/ # Shared resources
│ ├── config/ # Configuration modules
│ │ ├── database/ # Prisma database service
│ │ ├── google-map/ # Google Maps API service
│ │ └── mail/ # SMTP email service
│ ├── constant/ # Application constants
│ ├── dto/ # Shared DTOs (pagination, response)
│ ├── exceptions/ # Custom exception classes
│ ├── filters/ # Exception filters
│ ├── interceptors/ # Response interceptors
│ ├── helpers/ # Utility functions & validators
│ ├── i18n/ # Internationalization resources
│ └── common.module.ts # Common module exports
├── module/ # Feature modules
│ ├── auth/ # Authentication (JWT, guards, decorators)
│ │ ├── auth.controller.ts
│ │ ├── auth.service.ts
│ │ ├── constants/ # Auth-specific constants
│ │ ├── decorator/ # @Roles, @Public, @CurrentUser
│ │ ├── dto/ # Login DTO
│ │ ├── guards/ # JWT, Refresh, Role guards
│ │ ├── strategies/ # Passport strategies
│ │ └── auth.module.ts
│ ├── user/ # User management
│ │ ├── user.controller.ts
│ │ ├── user.service.ts
│ │ ├── user.repository.ts # Data access layer
│ │ ├── dto/ # Registration DTOs
│ │ └── user.module.ts
│ ├── address/ # Address management
│ │ ├── address.controller.ts
│ │ ├── address.service.ts
│ │ ├── address.repository.ts # Data access layer
│ │ ├── dto/ # Address DTOs
│ │ └── address.module.ts
│ └── ...
└── database/ # Database utilities
└── seeders/ # Database seeding scripts

prisma/
├── schema.prisma # Database schema
├── migrations/ # Database migration history
└── seed.ts # Seed script
\`\`\`

## 🔑 API Routes

### Authentication

| Method | Route                                | Description                  |
| ------ | ------------------------------------ | ---------------------------- |
| POST   | \`/api/v1/auth/register\`            | Register new user            |
| POST   | \`/api/v1/auth/login\`               | User login                   |
| POST   | \`/api/v1/auth/logout\`              | User logout                  |
| POST   | \`/api/v1/auth/refresh\`             | Refresh access token         |
| GET    | \`/api/v1/auth/verify-email/:token\` | Verify email                 |
| GET    | \`/api/v1/auth/profile\`             | Get user profile (protected) |

### User Management

| Method | Route                 | Description    |
| ------ | --------------------- | -------------- |
| POST   | \`/api/v1/users\`     | Create user    |
| GET    | \`/api/v1/users/:id\` | Get user by ID |
| PUT    | \`/api/v1/users/:id\` | Update user    |
| DELETE | \`/api/v1/users/:id\` | Delete user    |

### Address Management

| Method | Route                                   | Description           |
| ------ | --------------------------------------- | --------------------- |
| GET    | \`/api/v1/addresses/countries\`         | Get countries list    |
| GET    | \`/api/v1/addresses/states/:countryId\` | Get states by country |
| GET    | \`/api/v1/addresses/cities/:stateId\`   | Get cities by state   |
| POST   | \`/api/v1/addresses\`                   | Create address        |
| GET    | \`/api/v1/addresses/:id\`               | Get address           |
| PUT    | \`/api/v1/addresses/:id\`               | Update address        |
| DELETE | \`/api/v1/addresses/:id\`               | Delete address        |

## 📦 NPM Scripts

\`\`\`bash

# Development

npm run start # Run production build
npm run start:dev # Run with hot reload
npm run start:debug # Run with debugger

# Build & Compilation

npm run build # Build for production
npm run lint # Run ESLint

# Database

npm run prisma:migrate # Create and run migration
npm run prisma:seed # Run database seeders
npm run prisma:reset # Reset database and run migrations
npm run prisma:studio # Open Prisma Studio GUI

# Testing

npm run test # Run unit tests
npm run test:watch # Run tests in watch mode
npm run test:cov # Generate coverage report
npm run test:e2e # Run e2e tests
npm run test:e2e:watch # Run e2e tests in watch mode
\`\`\`

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication with access/refresh token rotation
- **Password Hashing**: Bcrypt with salt rounds for secure password storage
- **Role-Based Access Control**: Type-safe @Roles() decorator with enum validation
- **Input Validation**: Class validator DTOs with custom validators
- **Rate Limiting**: Global throttle guard (100 req/60s) with per-route customization
- **CORS Protection**: Configurable origin allowlist
- **SQL Injection Prevention**: Prisma parameterized queries + sortBy allowlist validation
- **Email Verification**: JWT-based email verification tokens (24h expiry)
- **Logout Implementation**: Token version increment prevents old tokens

## 🧪 Testing

Test files follow Jest conventions:

\`\`\`bash

# Run all tests

npm run test

# Run specific test file

npm run test -- user.service.spec.ts

# Generate coverage report

npm run test:cov
\`\`\`

Test coverage targets:

- **Unit Tests**: >80% branch coverage
- **Integration Tests**: Key API endpoints
- **E2E Tests**: Critical user flows

## 📚 Architecture Highlights

### Repository Pattern

Data access abstraction layer for clean separation of concerns:

- \`UserRepository\`: User CRUD operations
- \`AddressRepository\`: Address, Country, State, City operations

### Custom Exceptions

Type-safe exception handling:

- \`NotFoundException\`: 404 errors
- \`BusinessException\`: Business logic violations
- \`ConflictException\`: Duplicate resource errors

### Internationalization

Multi-language support:

- English (en)
- Hindi (hi)
- Extensible structure for additional languages

### Guards & Decorators

- \`JwtAuthGuard\`: Protects authenticated routes
- \`JwtRefreshGuard\`: Token refresh validation
- \`RoleGuard\`: Role-based authorization
- \`@Public()\`: Skip authentication
- \`@Roles(UserRole.ADMIN)\`: Role requirement

## 🔄 Development Workflow

### Creating a New Feature Module

1. Create module directory: \`src/module/feature-name\`
2. Generate NestJS module:
   \`\`\`bash
   nest g module module/feature-name
   \`\`\`
3. Create controller, service, repository:
   \`\`\`bash
   nest g controller module/feature-name
   nest g service module/feature-name
   \`\`\`
4. Create DTOs in \`dto/\` subdirectory
5. Add repository if database operations needed
6. Export from module providers

### Database Changes

1. Update \`prisma/schema.prisma\`
2. Create migration:
   \`\`\`bash
   npm run prisma:migrate
   \`\`\`
3. Name migration descriptively (e.g., "add_products_table")
4. Test migration: \`npm run prisma:reset\`

## 🤝 Contributing

1. Create feature branch: \`git checkout -b feature/your-feature\`
2. Make changes and test: \`npm run test\`
3. Commit with conventional format: \`git commit -m "feat: description"\`
4. Push and create PR

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues and questions:

- Check existing GitHub issues
- Create new issue with detailed description
- Contact development team
