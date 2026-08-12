import { BigIntColumn, BigIntPrimaryColumn } from '../BigIntColumn';

describe('BigIntColumn', () => {
  it('should apply as a property decorator without error', () => {
    expect(() => {
      class TestEntity {
        @BigIntColumn()
        amount!: number;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with additional column options without error', () => {
    expect(() => {
      class TestEntity {
        @BigIntColumn({ nullable: true, comment: 'Amount in cents' })
        amount!: number | null;
      }

      return TestEntity;
    }).not.toThrow();
  });
});

describe('BigIntPrimaryColumn', () => {
  it('should apply as a property decorator without error', () => {
    expect(() => {
      class TestEntity {
        @BigIntPrimaryColumn()
        id!: number;
      }

      return TestEntity;
    }).not.toThrow();
  });

  it('should apply with name option without error', () => {
    expect(() => {
      class TestEntity {
        @BigIntPrimaryColumn({ name: 'u_id' })
        id!: number;
      }

      return TestEntity;
    }).not.toThrow();
  });
});
