import { BooleanIntegerColumn } from '../BooleanIntegerColumn';

describe('BooleanIntegerColumn', () => {
  it('should apply as a property decorator without error', () => {
    expect(() => {
      class TestEntity {
        @BooleanIntegerColumn()
        isActive!: boolean;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with nullable option without error', () => {
    expect(() => {
      class TestEntity {
        @BooleanIntegerColumn({ nullable: true })
        isActive!: boolean | null;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with additional column options without error', () => {
    expect(() => {
      class TestEntity {
        @BooleanIntegerColumn({ default: 0, comment: 'Active flag' })
        isActive!: boolean;
      }

      return TestEntity;
    }).not.toThrow();
  });
});
