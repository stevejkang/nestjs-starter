import { Injectable } from '@nestjs/common';

/**
 * Base class for application facades.
 *
 * A facade orchestrates one or more use cases / services and transforms
 * domain results into presentation-layer DTOs. It is the natural
 * transaction boundary when using `@Transactional()`.
 *
 * Guidelines:
 * - One facade per bounded context concern (e.g., PublicBannerFacade, AdminBannerFacade)
 * - Facades may call multiple services but must NOT contain domain logic
 * - Response DTO construction belongs here, not in controllers or services
 * - Use `@Transactional()` on facade methods when atomicity is required across multiple service calls
 */
@Injectable()
export abstract class Facade {}
