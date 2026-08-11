import { ApiProperty } from '@nestjs/swagger';

export class ControllerResponseErrorObject {
  @ApiProperty({
    name: 'name',
    description: 'Error class name (e.g., "BadRequestException", "Error")',
    required: true,
    example: 'BadRequestException',
  })
  name: string;

  @ApiProperty({
    name: 'message',
    description: 'An error message',
    required: true,
  })
  message: string;

  @ApiProperty({
    name: 'stack',
    type: Array,
    description: 'An error stack (development environment only)',
    required: true,
  })
  stack: string[];
}

export class ControllerResponse {
  @ApiProperty({
    name: 'traceId',
    description: 'Trace ID',
    required: true,
    example: '7234527811174666241',
  })
  traceId: string;

  @ApiProperty({
    name: 'statusCode',
    description: 'HTTP status code',
    required: true,
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    name: 'timestamp',
    description: 'Response timestamp (ISO)',
    required: true,
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    name: 'path',
    description: 'Requested path',
    required: true,
    example: '/',
  })
  path: string;

  @ApiProperty({
    name: 'ok',
    description: 'Response success',
    required: true,
  })
  ok: boolean;
}

export class ControllerResponseOnError extends ControllerResponse {
  @ApiProperty({
    type: ControllerResponseErrorObject,
  })
  error: ControllerResponseErrorObject;
}
