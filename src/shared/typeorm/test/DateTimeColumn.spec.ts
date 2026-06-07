import { validate } from 'class-validator';
import { DateTimeColumn } from '../DateTimeColumn';

describe('DateTimeColumn', () => {
  it('should apply as a property decorator without error', () => {
    expect(() => {
      class TestEntity {
        @DateTimeColumn()
        createdAt!: Date;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with nullable option without error', () => {
    expect(() => {
      class TestEntity {
        @DateTimeColumn({ nullable: true })
        deletedAt!: Date | null;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with additional column options without error', () => {
    expect(() => {
      class TestEntity {
        @DateTimeColumn({ default: null, comment: 'Deletion timestamp' })
        deletedAt!: Date;
      }

      return TestEntity;
    }).not.toThrow();
  });

  describe('validator', () => {
    class NonNullableEntity {
      @DateTimeColumn()
      createdAt!: Date;
    }

    class NullableEntity {
      @DateTimeColumn({ nullable: true })
      deletedAt!: Date | null;
    }

    it('should accept a Date value', async () => {
      const entity = new NonNullableEntity();
      entity.createdAt = new Date(2024, 5, 15, 14, 30, 45);

      const errors = await validate(entity);

      expect(errors).toHaveLength(0);
    });

    it('should accept a valid datetime string', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).createdAt = '2024-06-15T14:30:45.000Z';

      const errors = await validate(entity);

      expect(errors).toHaveLength(0);
    });

    it('should accept null when nullable', async () => {
      const entity = new NullableEntity();
      entity.deletedAt = null;

      const errors = await validate(entity);

      expect(errors).toHaveLength(0);
    });

    it('should reject null when not nullable', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).createdAt = null;

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject an invalid datetime string', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).createdAt = 'not-a-datetime';

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject a number', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).createdAt = 12345;

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject a boolean', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).createdAt = true;

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
