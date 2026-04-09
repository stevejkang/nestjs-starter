import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { IS_LOCAL, IS_PRODUCTION } from '@shared/config/config';

export function initializeSwaggerDocument(app: INestApplication): void {
  const DEFAULT_URL = IS_LOCAL ? 'http://localhost' : IS_PRODUCTION ? 'https://example.com' : 'https://dev.example.com';

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .addServer(DEFAULT_URL, 'Default')
    .addServer('http://localhost', 'Local')
    .addServer('https://example.com', 'Staging')
    .addServer('https://example.com', 'Production')
    .setVersion('1.0.0')
    .build();

  const options: SwaggerCustomOptions = {
    customCss: `body { background: transparent; }
  .swagger-ui .topbar { display: none; }`,
    customSiteTitle: 'API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: 0,
      // docExpansion: 'none',
    },
  };

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, options);
}
