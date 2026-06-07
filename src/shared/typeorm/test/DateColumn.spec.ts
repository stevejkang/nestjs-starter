import { validate } from 'class-validator';
import { DateColumn } from '../DateColumn';

describe('DateColumn', () => {
  it('should apply as a property decorator without error', () => {
    expect(() => {
      class TestEntity {
        @DateColumn()
        date!: Date;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with nullable option without error', () => {
    expect(() => {
      class TestEntity {
        @DateColumn({ nullable: true })
        date!: Date | null;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with additional column options without error', () => {
    expect(() => {
      class TestEntity {
        @DateColumn({ default: null, comment: 'Birth date' })
        date!: Date;
      }

      return TestEntity;
    }).not.toThrow();
  });

  describe('validator', () => {
    class NonNullableEntity {
      @DateColumn()
      date!: Date;
    }

    class NullableEntity {
      @DateColumn({ nullable: true })
      date!: Date | null;
    }

    it('should accept a Date value', async () => {
      const entity = new NonNullableEntity();
      entity.date = new Date(2024, 5, 15);

      const errors = await validate(entity);

      expect(errors).toHaveLength(0);
    });

    it('should accept a valid date string', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).date = '2024-06-15';

      const errors = await validate(entity);

      expect(errors).toHaveLength(0);
    });

    it('should accept null when nullable', async () => {
      const entity = new NullableEntity();
      entity.date = null;

      const errors = await validate(entity);

      expect(errors).toHaveLength(0);
    });

    it('should reject null when not nullable', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).date = null;

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject an invalid date string', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).date = 'not-a-date';

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject a number', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).date = 12345;

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject a boolean', async () => {
      const entity = new NonNullableEntity();
      (entity as unknown as Record<string, unknown>).date = true;

      const errors = await validate(entity);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
