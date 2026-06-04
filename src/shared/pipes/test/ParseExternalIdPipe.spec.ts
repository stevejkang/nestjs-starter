import { BadRequestException } from '@nestjs/common';
import { ExternalId } from '../../common/ExternalId';
import { ParseExternalIdPipe } from '../ParseExternalIdPipe';

describe('ParseExternalIdPipe', () => {
  const entityType = 'user';
  let pipe: ParseExternalIdPipe;

  beforeEach(() => {
    pipe = new ParseExternalIdPipe(entityType);
  });

  describe('transform', () => {
    it('should decode a valid external ID to its internal numeric ID', () => {
      const id = 42;
      const encoded = ExternalId.encode(id, entityType);

      expect(pipe.transform(encoded)).toEqual(id);
    });

    it('should throw BadRequestException for an invalid external ID', () => {
      expect(() => pipe.transform('!invalid!')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for an empty string', () => {
      expect(() => pipe.transform('')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for a wrong entity type ID', () => {
      const encoded = ExternalId.encode(42, 'post');

      expect(() => pipe.transform(encoded)).toThrow(BadRequestException);
    });
  });
});
