# AGENTS.md

This file provides guidance for AI agents (Claude Code, Codex, etc.) working in this repository.

---

## Table of Contents

- [Work Cycle Rules](#work-cycle-rules)
- [Commit & PR Rules](#commit--pr-rules)
- [Architecture Overview](#architecture-overview)
- [Key Architectural Patterns](#key-architectural-patterns)
- [API Conventions](#api-conventions)
- [Code Style Guidelines](#code-style-guidelines)
- [Response Envelope](#response-envelope)
- [Error Handling](#error-handling)
- [Database Conventions](#database-conventions)
- [Infrastructure Utilities](#infrastructure-utilities)
- [Testing](#testing)
- [Security](#security)
- [Environment Configuration](#environment-configuration)
- [Path Aliases](#path-aliases)
- [Gotchas](#gotchas)
- [New Feature Guide](#new-feature-guide)

---

## Work Cycle Rules

> These rules apply to **every work session** without exception.

### 1. Keep AGENTS.md Up to Date

If a conversation or mid-task decision causes a direction change significant enough to affect `AGENTS.md`, the file must be updated to reflect the latest state.

- **This MD update must be a separate, isolated commit** — never bundled with feature, fix, or refactor commits.
- AGENTS.md is the source of truth for implementation conventions.
- When in doubt whether a change is "significant enough": if it would cause a future agent to make a wrong decision, it is significant enough.

### 2. Pre-Commit / Pre-PR Checklist

Before committing or opening a PR, verify the following:

1. **Conventions followed** — all changes comply with the guidelines defined in this file (Key Architectural Patterns, REST API Conventions, Code Style Guidelines, etc.)
2. **Tests added** — appropriate unit tests are written for new or changed logic
3. **Commit discipline** — commits follow the rules in Commit & PR Rules (meaningful units, signed, proper messages)
4. **CI expected to pass** — all checks that run in CI workflows (build, lint, typecheck, tests) pass locally before pushing

### 3. Respect .gitignore

**Never `git add -f` or force-commit a gitignored file.** If a file is in `.gitignore`, it is excluded from version control by design. This applies to all files without exception — `.env`, build artifacts, etc.

---

## Commit & PR Rules

### Commit Discipline

> These rules are critical. Agents must follow them strictly.

- **Keep commits semantic and focused** — each commit should represent one logically complete unit of work. Do not batch unrelated changes.
- **Commit immediately when a unit of work is done** — do not accumulate changes across multiple tasks. As soon as an individual piece of work is complete and passes verification, commit it.
- **Every commit must be CI-passing** — each individual commit must be in a state where the CI pipeline (build, lint, typecheck, tests) would pass. Never create a commit that would break CI, even if a subsequent commit would fix it.
- **Commits are merged as-is** — PRs use rebase merge (no squash). Every commit lands on `main` individually, so each must be a meaningful, self-contained unit that makes sense on its own in the main branch history. Commit messages and code comments should be written from the perspective of the final state (post-merge to main) — avoid intermediate decisions, session-specific context, or planning artifacts that lose meaning once merged.
- **Single author per commit** — always commit under the configured repository author. Co-authored commits (`Co-authored-by:`) are not allowed except in explicitly agreed exceptional cases.
- **All commits must be signed** (`git commit -S`). Unsigned commits will not be accepted.

### Commit Messages

Use **GitHub style**: imperative mood, capitalize first word, no period at end.

```
Add user TOTP enrollment endpoint
Fix refresh token expiry validation
Update user creation DTO validation rules
Remove unused Redis cache keys
```

- Keep subject line under 72 characters.
- Always add a body when possible (blank line after subject). Explain **why** the change was made, not just what. The more context, the better.
- **Never include internal planning references** (e.g., `Wave 1`, `T-3`, `Task 2`) in commit messages or bodies. These are ephemeral planning artifacts that lose meaning once merged to main. Only real issue/ticket numbers (e.g., `#123`, `PROJ-456`) belong in commits.

### Commit Squashing / Rebasing

- When commits within a branch need to be consolidated, use interactive rebase (`git rebase -i`).
- **Only adjacent commits may be squashed** without explicit user approval. Non-adjacent squashing reorders history and must be confirmed with the user first.
- Avoid trivially small commits (e.g., fixing a typo you just introduced) — amend the previous commit or squash before pushing.

### Pull Requests

- **Merge strategy**: Rebase merge (no merge commits, no squash).
- Keep PRs focused — one concern per PR.
- PR title follows the same commit message style.
- Reference related issues in the PR description.
- All checks (lint, type-check, tests) must pass before merging.

### Merge Rules

- **Always check for open PRs first** — before merging, check if there is an open PR on the upstream for the branch being merged.
- **Local fast-forward merge + push** — if an open PR exists, do NOT merge via `gh pr merge` or GitHub MCP tools. Instead, perform a local fast-forward merge (`git merge --ff-only`) on the base branch and push. This closes the upstream PR naturally via push and preserves a clean linear history.
- **Multiple branches → merge one at a time** — when merging several branches in sequence (e.g., `feature-a` → `develop` → `main`), do NOT merge all at once locally. Merge and push each base/destination pair sequentially so that each upstream PR is closed by the corresponding push. Merging everything locally before pushing leaves dangling open PRs on the upstream.

---

## Architecture Overview

### Layer Structure (Clean Architecture / DDD)

```
src/
  {module}/
    application/             # Use cases, facades, and application services
      {UseCase}UseCase/      # One folder per use case
        dto/                 # Request/Response DTOs
          {UseCase}UseCaseRequest.ts
          {UseCase}UseCaseResponse.ts
        {UseCase}UseCase.ts  # UseCase implementation
      {Facade}/              # Facade orchestrating multiple use cases/services
        dto/
          {Facade}FacadeRequest.ts
          {Facade}FacadeResponse.ts
        {Facade}Facade.ts
      {Service}/             # Application services
        {Service}Service.ts      # Service interface
        {Service}ServiceImpl.ts  # Service implementation
    domain/                  # Domain entities, value objects, strategies, events
      {Domain}.ts            # Aggregate roots and domain models
      {Event}.ts             # Domain events
      {Strategy}.ts          # Passport strategies (auth specific)
    guards/                  # NestJS guards (e.g., JwtAuthenticationGuard)
    infrastructure/          # Repositories and external dependencies
      entities/              # TypeORM entities
      mysql/                 # MySQL-specific implementations
        mapper/              # Entity ↔ Domain mappers
          Mysql{Repository}RepositoryMapper.ts
        Mysql{Repository}Repository.ts
      {Repository}Repository.ts  # Repository interface
    presentation/            # Controllers and DTOs
      dto/                   # Controller request/response DTOs
        {Controller}ControllerRequest.ts
        {Controller}ControllerResponse.ts
      {Controller}Controller.ts  # NestJS controllers
    {Module}Module.ts        # NestJS module definition
  shared/                    # Shared kernel
    common/                  # ExternalId, Semaphore, Snowflake, TimeUnit
    config/                  # Configuration and Swagger setup
    context/                 # RequestContext (AsyncLocalStorage-based traceId propagation)
    core/                    # Core building blocks
      application/           # UseCase interface, CoreResponse, Facade base
      domain/                # AggregateRoot, ValueObject, Result, DomainEvent, Identifier, UniqueEntityID, BooleanInteger
      presentation/          # ControllerResponse, Pagination, CursorPagination
        decorators/          # Custom validation/transformation decorators
    filters/                 # AllExceptionsFilter (global error handler)
    interceptors/            # CoreResponse, HttpLogging, Idempotency interceptors
    middlewares/             # TraceIdIssuance middleware
    modules/
      cache/                 # MethodCache, InvalidateMethodCache decorators, CacheKeyBuilder, LocalCache, RedisCacheModule
      distributed-lock/      # Redis-based distributed locking (DistributedLockService)
    pipes/                   # ParseExternalIdPipe, AppValidationPipe
    security/                # PasswordHandler (Argon2)
    typeorm/                 # Custom TypeORM column decorators/transformers
scheme/
  DDL.sql                   # Database schema definitions
  init.sql                  # Database initialization script
```

### Layer Chain

```
Controller → Facade → UseCase → Repository → Entity (TypeORM)
                 ↘ Service ↗         ↕
                                Domain (AggregateRoot)
```

This is a **Clean Architecture / DDD** layered design. The Facade layer sits between Controller and UseCase/Service, orchestrating cross-cutting concerns.

| Layer              | Responsibility                                                                                       | Naming                                          |
|--------------------|------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| **Presentation**   | HTTP concerns (decorators, params, guards, Swagger). Thin — delegates to Facade or UseCase.          | `{Domain}Controller`                            |
| **Facade**         | Orchestration. Composes multiple use cases/services, manages transactions, builds response DTOs.     | `{UseCase}Facade` or `{Domain}Facade`           |
| **UseCase**        | Single business operation. Owns one focused workflow. Injects repositories via interface tokens.     | `{Action}{Domain}UseCase`                       |
| **Service**        | Application-level service. Encapsulates reusable logic (e.g., token generation, external API calls). | `{Domain}Service` / `{Domain}ServiceImpl`       |
| **Domain**         | Business rules. AggregateRoot, ValueObject, DomainEvent. No framework dependencies.                  | `{Domain}` (e.g., `User`, `Connection`)         |
| **Infrastructure** | Data access. TypeORM repositories with mapper classes converting Entity ↔ Domain.                    | `Mysql{Domain}Repository`, `{Domain}Repository` |

**Dependency Rules (strict):**

- Controller injects **Facade or UseCase** — never Repository or Service directly (simple read-only queries via UseCase are acceptable)
- Facade may inject **UseCases, Services, and Repositories**
- UseCase injects **Repositories** via interface tokens — never other UseCases
- Service does **not inject other Services** (no cross-service dependencies)
- Domain layer has **zero framework imports** — pure TypeScript only
- Repository implementations live in `infrastructure/mysql/` and are bound via provider tokens in the Module

---

## Key Architectural Patterns

### 1. Domain Entities

- Extend `AggregateRoot<Props>` for entities
- Use **private constructor** + **static factory methods**: `createNew` (new entity, no ID) and `create` (reconstitute from persistence, with ID)
- Return `Result<Entity>` from factory methods and domain operations
- Use **getter methods** for property access (no direct property access)
- Domain logic methods return `Result<Entity>` (immutable updates)
- Use `addDomainEvent()` to raise domain events from within the entity

**Example:**

```typescript
interface UserProps {
  email: string;
  password: string;
  isApproved: boolean;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(props, id);
  }

  static createNew(props: UserProps): Result<User> {
    return this.create({ ...props });
  }

  static create(props: UserProps, id?: UniqueEntityID): Result<User> {
    return Result.ok(new User(props, id));
  }

  get email(): string {
    return this.props.email;
  }

  approve(): Result<User> {
    if (this.props.isApproved) {
      return Result.fail('Already approved');
    }
    return User.create({ ...this.props, isApproved: true }, this.id);
  }
}
```

### 2. Value Objects

- Extend `ValueObject<Props>` for immutable values
- Use **protected constructor**
- Implement `equals()` method for value comparison

### 3. Domain Events

- Implement `DomainEvent` interface or extend `BaseDomainEvent`
- Events carry `aggregateId`, `eventType`, and `occurredAt`
- Raised via `AggregateRoot.addDomainEvent()`
- Consumed via `@nestjs/event-emitter`

### 4. Use Cases

- Implement `UseCase<IRequest, IResponse>` interface
- Use `@Injectable()` decorator
- Inject repositories via **interface tokens** (e.g., `@Inject(USER_REPOSITORY)`)
- Return response DTOs (not domain entities directly)
- Throw NestJS exceptions (`BadRequestException`, etc.) for errors

**Example:**

```typescript
@Injectable()
export class GetUserUseCase implements UseCase<GetUserUseCaseRequest, GetUserUseCaseResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(request: GetUserUseCaseRequest): Promise<GetUserUseCaseResponse> {
    const user = await this.userRepository.findOneById(request.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { ok: true, user };
  }
}
```

### 5. Facades

- Extend abstract `Facade` base class
- Orchestrate one or more use cases / services
- Transform domain results into presentation-layer DTOs
- Use `@Transactional()` when atomicity is required across multiple service calls
- One facade per bounded context concern (e.g., `PublicBannerFacade`, `AdminBannerFacade`)
- Facades must NOT contain domain logic — delegation only

### 6. Repositories

- Define **interface** in `infrastructure/{Repository}.ts`
- Implement in `infrastructure/mysql/Mysql{Repository}.ts`
- Use **mapper classes** to convert Entity ↔ Domain
- Repository methods return `Promise<Domain | null>` or `Promise<Domain>`
- Use **BooleanInteger** enum for MySQL boolean fields (1/0)

**Example:**

```typescript
// Repository Interface
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findOneById(id: number): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Implementation
export class MysqlUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findOneById(id: number): Promise<User | null> {
    const entity = await this.userRepository
      .createQueryBuilder()
      .where('u_id = :id', { id })
      .andWhere('u_is_deleted = :isDeleted', {
        isDeleted: BooleanInteger.FALSE,
      })
      .getOne();

    if (!entity) {
      return null;
    }

    return MysqlUserRepositoryMapper.toDomain(entity);
  }
}
```

**Entity ↔ Domain Separation:**

- **TypeORM entities** (`infrastructure/entities/`) are persistence concerns — they carry ORM decorators and map directly to DB columns.
- **Domain models** (`domain/`) are pure business logic — they extend `AggregateRoot` or `ValueObject` with no framework imports.
- These two layers must never be conflated. Repositories are the **only** bridge between them: they accept/return domain models and use **mapper classes** (`toDomain()` / `toEntity()`) for conversion internally.
- Use cases and facades must operate on **domain models**, never on TypeORM entities directly.

### 7. Controllers

- Use NestJS decorators: `@Controller()`, `@Post()`, `@Get()`, etc.
- Add Swagger decorators: `@ApiTags()`, `@ApiOperation()`, `@ApiOkResponse()`, `@ApiCreatedResponse()` (for POST that creates resources)
- Response format: `{ traceId, statusCode, timestamp, path, ok, result }`
- Inject use cases or facades via constructor
- Controllers are exempt from `explicit-function-return-type` ESLint rule
- Use `@UseGuards(JwtAuthenticationGuard)` for authenticated routes
- The global validation pipe is `AppValidationPipe` (registered in `main.ts`). Unlike the built-in `ValidationPipe`, it does **not** auto-coerce `@Param` or `@Query` values based on TypeScript metatypes. This means `@Param('id') id: number` will receive a **string** at runtime despite the `number` annotation — route params and query params must use an explicit pipe (`ParseExternalIdPipe`, `ParseIntPipe`, etc.) to convert types.
- Use `ParseExternalIdPipe` to decode public-facing ExternalId parameters
- For HTTP method, status code, and response body rules, see **REST API Conventions** below

### 8. DTOs (Data Transfer Objects)

- Use `class-validator` decorators for validation
- Use `class-transformer` decorators for transformation
- Add `@ApiProperty()` for Swagger documentation
- Controller DTOs extend `ControllerResponse` for responses
- Separate request/response DTOs in `dto/` folders
- Use shared custom decorators from `@shared/core/presentation/decorators/`:

| Decorator                   | When to Use                                                             | Behavior                                                                                                                                                                                                                      |
|-----------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `@IsValidUrl()`             | URL fields in request DTOs                                              | Validates string is a valid URL. HTTPS-only by default (`httpsOnly: true`). Options: `httpsOnly: false` to allow HTTP, `allowAbsolutePath: true` to accept `/path` style, `when: (obj) => boolean` for conditional validation |
| `@TransformEmptyToNull()`   | Optional string fields that should treat `""` as absent                 | Transforms empty string `""` to `null`. Use on nullable string fields where clients may send empty strings instead of omitting the field                                                                                      |
| `@TransformToBoolean()`     | Boolean query parameters or body fields received as strings             | Converts truthy (`true`, `1`, `"true"`, `"yes"`, `"on"`) and falsy (`false`, `0`, `"false"`, `"no"`, `"off"`) values to actual `boolean`. Throws `BadRequestException` for unrecognized values                                |
| `@TransformToNumber()`      | Numeric fields received as strings (e.g., query parameters)             | Converts string to `number`. Preserves `null`/`undefined` as-is. Throws `BadRequestException` if value is not a valid number                                                                                                  |
| `@TransformToNumberArray()` | Comma-separated numeric IDs in query parameters (e.g., `?ids=1,2,3`)    | Splits comma-separated string into `number[]`. Filters out `NaN` values. Also accepts pre-split arrays                                                                                                                        |
| `@TransformCommaToArray()`  | Comma-separated string values in query parameters (e.g., `?tags=a,b,c`) | Splits comma-separated string into `string[]` with trimmed values. Also accepts pre-split arrays                                                                                                                              |

### 9. Pagination

Two pagination strategies available in `@shared/core/presentation/`:

- **Offset-based**: Extend `PaginationQuery` for request, `PaginationResponse` for response
- **Cursor-based**: Extend `CursorPaginationQuery` for request, `CursorPaginationResponse` for response

### 10. Modules

- Register repositories using **provider tokens**
- Import TypeORM entities via `TypeOrmModule.forFeature([])`
- Declare all controllers, use cases, facades, services, strategies in providers

**Example:**

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
  ],
  controllers: [UserController],
  providers: [
    GetUserUseCase,
    UserFacade,
    {
      provide: USER_REPOSITORY,
      useClass: MysqlUserRepository,
    },
  ],
})
export class UserModule {}
```

---

## API Conventions

### URL Design

#### Path Structure

- All API paths start with `/api/{version}` prefix (e.g. `/api/v1/users`)
- Resource names are **plural nouns** in kebab-case: `/api/v1/users`, `/api/v1/backup-codes`
- No verbs in paths — the HTTP method serves as the verb: `/api/v1/users` (O), ~~/api/v1/get-users~~ (X)
- Hierarchical relationships use nesting.
  `/api/v1/users/{userId}/backup-codes/{codeId}/logs`

#### Path Parameters

- Resource identifiers are always **ExternalId** (Base62) — never expose raw DB IDs.
- Parameter names use camelCase: `{userId}`, `{storeId}`

#### Non-CRUD Actions (Commands)

State transitions or command-style operations that cannot be expressed as PATCH use the **sub-resource verb pattern**:

- `POST /api/v1/users/{userId}/approve`
- `POST /api/v1/users/{userId}/suspend`
- `POST /api/v1/orders/{orderId}/cancel`

Use this only when PATCH is insufficient. Simple field updates must use PATCH. **PUT is not used** in this project — partial updates go through PATCH; full replacement requires separate discussion.

### HTTP Response Conventions

#### Status Codes and Response Bodies by Method

| Method        | Purpose              | Status Code      | Response Body                       |
|---------------|----------------------|------------------|-------------------------------------|
| GET           | Retrieve resource(s) | `200 OK`         | Full resource or list               |
| POST (create) | Create a resource    | `201 Created`    | `{ id }` — ExternalId only          |
| POST (action) | Non-CRUD command     | `200 OK`         | Determined per action               |
| PATCH         | Partial update       | `200 OK`         | Updated full resource (Same as GET) |
| DELETE        | Remove a resource    | `204 No Content` | No body                             |

**POST create returns only the created resource's ExternalId.** If the client needs the full object, it should issue a separate `GET /api/v1/{resource}/{id}`. This cleanly separates creation and retrieval responsibilities.

**DELETE returns `204 No Content` with an empty body.** The `204` response is exempt from the standard `AllExceptionsFilter` response envelope — no `{ traceId, statusCode, ok, result }` wrapping.

**PATCH returns `200 OK` with the full updated resource.** This allows the client to immediately reflect server-computed fields (e.g., `updatedAt`, computed properties) without an additional round-trip.

#### Required Decorators

| Method        | Required Decorators                                           |
|---------------|---------------------------------------------------------------|
| GET           | `@HttpCode(HttpStatus.OK)`, `@ApiOkResponse()`                |
| POST (create) | `@HttpCode(HttpStatus.CREATED)`, `@ApiCreatedResponse()`      |
| POST (action) | `@HttpCode(HttpStatus.OK)`, `@ApiOkResponse()`                |
| PATCH         | `@HttpCode(HttpStatus.OK)`, `@ApiOkResponse()`                |
| DELETE        | `@HttpCode(HttpStatus.NO_CONTENT)`, `@ApiNoContentResponse()` |

#### Swagger Response Decorator Rules

**Success responses** always use `description: 'Success'`:

- `@ApiOkResponse({ description: 'Success', type: SomeControllerResponse })`
- `@ApiCreatedResponse({ description: 'Success', type: SomeControllerResponse })`
- `@ApiNoContentResponse({ description: 'Success' })`

**Error responses** always use `type: ControllerResponseOnError` with a specific description:

All endpoints guarded with `@UseGuards(JwtAuthenticationGuard)` must include:

- `@ApiUnauthorizedResponse({ description: 'Authentication failed', type: ControllerResponseOnError })`
- `@ApiForbiddenResponse({ description: 'Insufficient permissions', type: ControllerResponseOnError })`

Single-resource endpoints (GET by ID, PATCH, DELETE) must also include:

- `@ApiNotFoundResponse({ description: 'Resource not found', type: ControllerResponseOnError })`

#### Controller Examples

**POST (create):**

```typescript
@Post()
@HttpCode(HttpStatus.CREATED)
@ApiCreatedResponse({ description: 'Success', type: CreateUserControllerResponse })
async createUser(@Body() request: CreateUserControllerRequest) {
  const result = await this.createUserUseCase.execute({ ... });
  return { id: result.id };
}
```

**PATCH (update):**

```typescript
@Patch(':userId')
@HttpCode(HttpStatus.OK)
@ApiOkResponse({ description: 'Success', type: UpdateUserControllerResponse })
async updateUser(
  @Param('userId', ParseExternalIdPipe) userId: number,
  @Body() request: UpdateUserControllerRequest,
) {
  return await this.updateUserUseCase.execute({ userId, ...request });
}
```

**DELETE:**

```typescript
@Delete(':userId')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiNoContentResponse({ description: 'Success' })
async deleteUser(@Param('userId', ParseExternalIdPipe) userId: number) {
  await this.deleteUserUseCase.execute({ userId });
  return;
}
```

> `204 No Content` endpoints must explicitly `return;` with no value. Omitting the return statement or returning an object will cause NestJS to serialize a response body, violating the HTTP `204` contract.

---

## Code Style Guidelines

### TypeScript

#### Types and Interfaces

- **Explicit return types required** for all functions/methods (enforced by ESLint)
- **No `any` type allowed** — use `unknown` if type is truly unknown
- Exception: Controllers are exempt from explicit return types
- Use `interface` for object contracts, `type` for unions/aliases
- Use `enum` for constants with semantic meaning

#### Enum Rules

- Always use the TypeScript **`enum` keyword**. Do not emulate enums with `const` objects or class static properties.
- Use external data boundaries (API requests, DB raw values, etc.) to **parse/validate into enum types immediately** — internal logic must only operate on enum-typed values.
- Use `BooleanInteger` enum (`TRUE = 1`, `FALSE = 0`) for MySQL boolean columns.

```typescript
// Good
export enum ConnectionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Bad — do not use const objects as enum substitutes
export const ConnectionStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED' } as const;
```

#### Naming Conventions

- **Classes/Interfaces/Types**: PascalCase (`User`, `UserRepository`, `GetUserUseCase`)
- **Variables/Functions**: camelCase (`userId`, `getUserToken`)
- **Constants/Tokens**: UPPER_CASE (`JWT_SECRET`, `USER_REPOSITORY`). Local `const` variables may use camelCase — ESLint allows both
- **Enum members**: UPPER_CASE (`BooleanInteger.TRUE`)
- **Unused variables**: Prefix with `_` (`_unusedParam`)
- **TypeORM entity columns**: Prefix with table abbreviation (`u_id`, `u_email`)

#### File & Class Naming Patterns

| Artifact                  | Class Name                     | File Name                         | Location                                   |
|---------------------------|--------------------------------|-----------------------------------|--------------------------------------------|
| Domain Entity             | `User`                         | `User.ts`                         | `{module}/domain/`                         |
| Value Object              | `Email`                        | `Email.ts`                        | `{module}/domain/`                         |
| Domain Event              | `UserApprovedEvent`            | `UserApprovedEvent.ts`            | `{module}/domain/`                         |
| UseCase                   | `GetUserUseCase`               | `GetUserUseCase.ts`               | `{module}/application/GetUserUseCase/`     |
| UseCase Request DTO       | `GetUserUseCaseRequest`        | `GetUserUseCaseRequest.ts`        | `{module}/application/GetUserUseCase/dto/` |
| UseCase Response DTO      | `GetUserUseCaseResponse`       | `GetUserUseCaseResponse.ts`       | `{module}/application/GetUserUseCase/dto/` |
| Facade                    | `UserFacade`                   | `UserFacade.ts`                   | `{module}/application/UserFacade/`         |
| Service Interface         | `TokenService`                 | `TokenService.ts`                 | `{module}/application/TokenService/`       |
| Service Implementation    | `TokenServiceImpl`             | `TokenServiceImpl.ts`             | `{module}/application/TokenService/`       |
| Controller                | `UserController`               | `UserController.ts`               | `{module}/presentation/`                   |
| Controller Request DTO    | `CreateUserControllerRequest`  | `CreateUserControllerRequest.ts`  | `{module}/presentation/dto/`               |
| Controller Response DTO   | `CreateUserControllerResponse` | `CreateUserControllerResponse.ts` | `{module}/presentation/dto/`               |
| Repository Interface      | `UserRepository`               | `UserRepository.ts`               | `{module}/infrastructure/`                 |
| Repository Implementation | `MysqlUserRepository`          | `MysqlUserRepository.ts`          | `{module}/infrastructure/mysql/`           |
| Repository Mapper         | `MysqlUserRepositoryMapper`    | `MysqlUserRepositoryMapper.ts`    | `{module}/infrastructure/mysql/mapper/`    |
| TypeORM Entity            | `UserEntity`                   | `UserEntity.ts`                   | `{module}/infrastructure/entities/`        |
| Module                    | `UserModule`                   | `UserModule.ts`                   | `{module}/`                                |
| Guard                     | `JwtAuthenticationGuard`       | `JwtAuthenticationGuard.ts`       | `{module}/guards/`                         |

#### Formatting

- **Quotes**: Single quotes only (`'string'`)
- **Semicolons**: Required at end of statements
- **Object curly spacing**: Always spaces (`{ foo }`, not `{foo}`)
- **Comma dangle**: Always for multiline arrays/objects
- **Method signatures**: Use method style, not property style
  ```typescript
  // Good
  interface Foo {
    bar(): void;
  }
  // Bad
  interface Foo {
    bar: () => void;
  }
  ```

#### Import Organization

**Import order** (enforced by ESLint `import-x/order` in `eslint.config.mjs`, no blank lines between groups):

1. Node.js built-in modules (`fs`, `path`)
2. External modules (`typeorm`, `axios`), then `@nestjs/**` modules (same ESLint `external` group — `@nestjs/**` sorted after others)
3. `@shared/**` modules (internal shared)
4. Parent/sibling modules (relative imports)

**Example:**

```typescript
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BooleanInteger } from '@shared/core/domain/BooleanInteger';
import { UserRepository } from '../UserRepository';
import { User } from '../../domain/User';
```

- **Unused imports**: Automatically removed by linter (`unused-imports` plugin)

---

## Response Envelope

### Success Response

`CoreResponseInterceptor` wraps all successful responses in a standardized envelope:

```json
{
  "traceId": "7234527811174666241",
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/connections",
  "ok": true,
  "result": {
    "connections": []
  }
}
```

- Controllers return **only the business payload** (e.g., `{ connections: [] }`). The interceptor wraps it automatically.
- `204 No Content` responses (e.g., DELETE) are **exempt** — they return an empty body per HTTP spec.
- Swagger response DTOs must reflect this structure: extend `ControllerResponse` (envelope fields) and declare a typed `result` property containing the business payload.

**Response DTO pattern:**

```typescript
export class FooControllerResponseResult {
  @ApiProperty({ description: '...' })
  someField: string;
}

export class FooControllerResponse extends ControllerResponse {
  @ApiProperty({ type: FooControllerResponseResult })
  result: FooControllerResponseResult;
}
```

### Error Response

See **Error Handling > Global Error Filter** below for the error envelope format.

---

## Error Handling

### Domain Layer

- Use `Result<T>` pattern for operations that can fail
- Return `Result.ok(value)` for success
- Return `Result.fail('error message')` for failures
- Never throw exceptions in domain layer

### Application/Presentation Layer

- Throw NestJS exceptions in use cases/facades/controllers
- Use appropriate HTTP exceptions:
  - `BadRequestException` — validation errors, business rule violations
  - `UnauthorizedException` — authentication failures
  - `ForbiddenException` — authorization failures
  - `NotFoundException` — resource not found

### Global Error Filter

`AllExceptionsFilter` catches all unhandled exceptions and returns a standardized response:

```json
{
  "traceId": "7234527811174666241",
  "statusCode": 500,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/resource",
  "ok": false,
  "error": {
    "name": "Error",
    "message": "Something went wrong",
    "stack": ["(development only)"]
  },
  "result": {}
}
```

Stack traces are included only in non-production environments.

`204 No Content` responses (e.g., DELETE) are exempt from this envelope — they return an empty body per HTTP spec.

---

## Database Conventions

### DDL Schema

- Definitions in `scheme/DDL.sql`
- All table names in snake_case (e.g., `user`, `user_backup_code`)
- Hierarchical tables use parent table name as prefix (e.g., `user`, `user_backup_code`)
- Similar-type tables align prefixes for clarity (e.g., `store_review`, `store_review_report`)
- Column names in snake_case, prefixed with table abbreviation (e.g., `u_id`, `u_email` for `user` table)
- If abbreviation conflicts with another table, extend to maintain uniqueness (e.g., `srv_` instead of `sr_`)
- Avoid ENUM types unless values are clearly permanent
- No foreign keys — reference via `{current_abbr}_{target_abbr}_id` columns

### TypeORM Entities

- Extend `BaseEntity`
- Use `@Entity({ name: 'table_name' })` decorator
- Prefix columns with table abbreviation
- Use custom decorators from `@shared/typeorm/`:
  - `@DateTimeColumn()` — MySQL `DATETIME` ↔ JS `Date` with timezone-safe transformer
  - `@DateColumn()` — MySQL `DATE` ↔ JS `Date` (date-only, no time component)
  - `@BooleanIntegerColumn()` — MySQL `TINYINT(1)` ↔ `BooleanInteger` enum (`1`/`0`)
- Boolean fields stored as `number` (use `BooleanInteger` enum: `TRUE = 1`, `FALSE = 0`)

### Query Builders

- Use `createQueryBuilder()` for complex queries
- Use named parameters (`:paramName`) for values
- Always filter soft-deleted records (e.g., `u_is_deleted = 0`)

---

## Infrastructure Utilities

### ExternalId

Public-facing IDs use `ExternalId` (Base62 encoded with entity-type-specific alphabet shuffling). Never expose raw database IDs in APIs — always encode via `ExternalId.encode(id, entityType)` and decode via `ParseExternalIdPipe` in controllers.

### AppValidationPipe

Custom global validation pipe (registered in `main.ts`) that extends NestJS's `ValidationPipe`. Skips implicit primitive type coercion for `@Param` and `@Query` metadata types so that custom pipes like `ParseExternalIdPipe` receive the raw string value from the URL. Class-typed DTOs (body and non-primitive query DTOs) are still validated and transformed normally via `super.transform()`.

### Cache (Redis)

- `MethodCache` — method-level caching decorator (file: `RedisCacheDecorator.ts`)
- `InvalidateMethodCache` — cache invalidation decorator on writes (file: `InvalidateCacheDecorator.ts`)
- `buildCacheKey()` — structured cache key generation function (file: `CacheKeyBuilder.ts`)
- `LocalCache` — in-process cache layer used internally by `MethodCache` for stale-while-revalidate
- `CacheClient` — abstract Redis client interface (file: `interfaces.ts`). Injection token: `CACHE_CLIENT`
- `RedisCacheModule` — NestJS module for registering the cache client provider

### Distributed Lock

- `DistributedLockService` — Redis-based distributed locking for concurrent access control
- `LockClient` — abstract lock client interface (file: `interfaces.ts`). Injection token: `LOCK_CLIENT`

### Idempotency

- `IdempotencyInterceptor` — prevents duplicate request processing

### Response & Logging Interceptors

- `CoreResponseInterceptor` — wraps successful responses in the standardized envelope. Exempts `204 No Content`
- `HttpLoggingInterceptor` — logs HTTP method, URL, status code, and response time

### Snowflake

- `Snowflake` — distributed unique ID generator (Twitter Snowflake algorithm). Used for trace IDs

### Semaphore

- `Semaphore` — concurrency limiter for controlling parallel execution

### TimeUnit

- `TimeUnit` — time unit conversion utility (ms, seconds, minutes, hours, days)

### Trace ID

- `TraceIdIssuanceMiddleware` — assigns a Snowflake-based trace ID to every request

### Request Context

- `RequestContext` — AsyncLocalStorage-based traceId propagation; `RequestContext.getTraceId()` works anywhere in the request's async call chain without a request object (use it where no `request` is available, e.g. outbound HTTP client logging)

---

## Testing

### Test File Structure

- Test files named `{FileName}.spec.ts`
- Located alongside source files (or in a `test/` subfolder within the module)
- Use `describe()` blocks for grouping
- Use `it()` for individual test cases
- Use Jest matchers (`expect()`, `toEqual()`, `toBeDefined()`, etc.)

### Mocking

- Mock repository interfaces, not implementations
- Test domain logic in isolation

---

## Security

### Password Handling

- Use `PasswordHandler` class for all password operations (all methods are **static**)
- `hashPassword()` — hash with Argon2id
- `comparePasswords()` — verify password matches
- `needsRehash()` — check if hash needs upgrading
- Never store plain-text passwords

### Authentication

- JWT tokens via custom header (actual key name is exported as `AUTH_HEADER` from `src/auth/domain/JwtStrategy.ts`)
- Use `JwtAuthenticationGuard` for protected routes
- Token validation in `JwtStrategy` (Passport custom strategy)

---

## Environment Configuration

Environment variables are loaded via `dotenv` in `src/shared/config/config.ts`. The file selected depends on `NODE_ENV`:

| `NODE_ENV`                   | Env file                 | Start command              |
|------------------------------|--------------------------|----------------------------|
| `production` / `development` | `.env`                   | `npm run start:prod`       |
| `local`                      | `.env.local`             | `npm run start:local`      |
| `local_development`          | `.env.local_development` | `npm run start:local:dev`  |
| `local_production`           | `.env.local_production`  | `npm run start:local:prod` |
| `test`                       | `.env` (fallback)        | `npm test`                 |

> When `NODE_ENV=test` (Jest default), the `required()` helper in `config.ts` skips missing-variable errors so tests can run without a full `.env` file.

---

## Path Aliases

- Use `@shared/*` for imports from `src/shared/*`
- Configured in `tsconfig.json` paths and Jest `moduleNameMapper`
- **Example**: `import { Result } from '@shared/core/domain/Result';`

---

## Gotchas

- **No direct `process.env` access** — always use the config layer in `src/shared/config/config.ts` (getter functions or config constants). Direct `process.env.X` reads are forbidden except in `config.ts` itself or in cases where no alternative exists (e.g., very early bootstrap). If you must access `process.env` directly, add an explicit comment explaining why.
- **`as any` / `@ts-ignore` / `@ts-expect-error` are banned** — never suppress type errors. If an external library has a type mismatch, fix the type or use `unknown` with proper narrowing. This is also enforced in Code Style Guidelines but repeated here for visibility.
- **Transactions** — when multiple DB mutations must be atomic, use `@Transactional()` (from `typeorm-transactional`) on the Facade method. Do not manually manage `EntityManager` or `QueryRunner` transactions. The transaction infrastructure is initialized in `main.ts` via `initializeTransactionalContext()` and wired in `AppModule` via `addTransactionalDataSource()` — these must be present for `@Transactional()` to work.
- **Pre-commit verification** — before every commit, confirm that `npm run lint:check`, `npm run typecheck`, and `npm test` all pass locally. Do not rely on CI to catch issues after push.

---

## New Feature Guide

### Adding a New Module

1. Create the `src/{module}/` directory with the standard layer subdirectories:
  - `application/` (use cases, facades, services)
  - `domain/` (aggregate roots, value objects, events)
  - `infrastructure/` (repository interfaces, `entities/`, `mysql/`, `mysql/mapper/`)
  - `presentation/` (controllers, `dto/`)
  - `guards/` (if needed)
2. Create `{Module}Module.ts` at the module root — register controllers, providers, and repository tokens
3. Import `TypeOrmModule.forFeature([...entities])` in the module
4. Register the module in `AppModule` imports

### Adding a New Entity (Domain + Infrastructure)

1. Define the **domain model** in `{module}/domain/{Domain}.ts` — extend `AggregateRoot<Props>`, use private constructor + static factory methods (`create`, `createNew`)
2. Create the **TypeORM entity** in `{module}/infrastructure/entities/{Domain}Entity.ts` — use `@Entity({ name: 'table_name' })`, prefix columns with table abbreviation
3. Define the **repository interface** in `{module}/infrastructure/{Domain}Repository.ts` — export the `Symbol` token and the interface
4. Implement the **repository** in `{module}/infrastructure/mysql/Mysql{Domain}Repository.ts`
5. Create the **mapper** in `{module}/infrastructure/mysql/mapper/Mysql{Domain}RepositoryMapper.ts` — `toDomain()` and `toEntity()` methods
6. Add the DDL to `scheme/DDL.sql`
7. Register the repository provider token in the module's `providers` array

### Adding a New API Endpoint

1. Add the controller method in `{module}/presentation/{Domain}Controller.ts`
2. Apply required decorators: `@HttpCode()`, Swagger response decorators (`@ApiOkResponse`, `@ApiCreatedResponse`, etc.), `@ApiOperation()`
3. Add `@UseGuards(JwtAuthenticationGuard)` if authentication is required — include `@ApiUnauthorizedResponse` and `@ApiForbiddenResponse`
4. Create request/response DTOs in `{module}/presentation/dto/` — use `class-validator` decorators and `@ApiProperty()`
5. Create or update the UseCase in `{module}/application/{UseCase}UseCase/` with request/response DTOs
6. If the endpoint orchestrates multiple use cases or services, create or update a Facade in `{module}/application/{Facade}/`
7. Delegate all business logic to UseCase/Facade — keep the controller thin
