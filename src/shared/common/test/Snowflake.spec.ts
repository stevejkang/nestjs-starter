import { Snowflake } from '../Snowflake';

const tests = [
  {
    timestamp: 1653653263221,
    value: '6935924496540897281',
    shard_id: 1,
    sequence: 1,
  },
  {
    timestamp: 1653653289600,
    value: '6935924607185511855',
    shard_id: 750,
    sequence: 1455,
  },
  {
    timestamp: 1653653311149,
    value: '6935924697568571351',
    shard_id: 750,
    sequence: 4055,
  },
];

describe('Snowflake', () => {
  beforeEach(() => {
    Snowflake.SEQUENCE = 1;
  });

  describe('generate', () => {
    it('should generate a snowflake', () => {
      for (const test of tests) {
        Snowflake.SEQUENCE = test.sequence;
        expect(
          Snowflake.generate({
            timestamp: test.timestamp,
            shard_id: test.shard_id,
          }).toString(),
        ).toEqual(test.value);
      }
    });

    it('should generate a random snowflake', () => {
      const generated: string[] = [];
      for (const test of [...Array(5)]) {
        generated.push(Snowflake.generate());
      }
      expect(generated.length).toEqual(new Set(generated).size);
    });

    it('should generate a unique snowflake', () => {
      const generated: string[] = [];
      for (const test of [...Array(1e6)]) {
        generated.push(Snowflake.generate());
      }
      expect(generated.length).toEqual(new Set(generated).size);
    });
  });

  describe('deconstruct', () => {
    it('should deconstruct a snowflake', () => {
      for (const test of tests) {
        const parsed = Snowflake.parse(test.value);
        expect(parsed.timestamp).toEqual(test.timestamp);
        expect(parsed.sequence).toEqual(test.sequence);
        expect(parsed.shard_id).toEqual(test.shard_id);
      }
    });
  });

  describe('isValid', () => {
    it('should deconstruct a snowflake', () => {
      const tests = [
        { value: '6917082698162902015', valid: true },
        { value: 'abv', valid: false },
      ];
      for (const test of tests) {
        const parsed = Snowflake.isValid(test.value);
        expect(parsed).toEqual(test.valid);
      }
    });
  });
});
