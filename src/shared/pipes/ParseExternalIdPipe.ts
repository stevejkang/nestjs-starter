import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ExternalId } from '../common/ExternalId';

export class ParseExternalIdPipe implements PipeTransform<string, number> {
  constructor(private readonly entityType: string) {}

  transform(value: string): number {
    const id = ExternalId.decode(value, this.entityType);

    if (id === null) {
      throw new BadRequestException(`Invalid external ID: ${value}`);
    }

    return id;
  }
}
