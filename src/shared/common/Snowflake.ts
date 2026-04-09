export class Snowflake {
  static EPOCH = Date.UTC(1970, 0, 1).valueOf();
  static SHARD_ID = 1;
  static SEQUENCE = 1;

  static generate({
    timestamp = Date.now(),
    shard_id = Snowflake.SHARD_ID,
  }: { timestamp?: Date | number; shard_id?: number } = {}): string {
    if (timestamp instanceof Date) {
      timestamp = timestamp.valueOf();
    } else {
      timestamp = new Date(timestamp).valueOf();
    }

    let result = (BigInt(timestamp) - BigInt(Snowflake.EPOCH)) << BigInt(22);
    result = result | (BigInt(shard_id % 1024) << BigInt(12));
    result = result | BigInt(Snowflake.SEQUENCE++ % 4096);

    return result.toString();
  }

  static parse(snowflake: SnowflakeResolvable): DeconstructedSnowflake {
    const binary = Snowflake.binary(snowflake);

    return {
      timestamp: Snowflake.extractBits(snowflake, 1, 41),
      shard_id: Snowflake.extractBits(snowflake, 42, 10),
      sequence: Snowflake.extractBits(snowflake, 52),
      binary,
    };
  }

  static isValid(snowflake: string): boolean {
    if (!/^\d{19}$/.test(snowflake)) {
      return false;
    }

    try {
      Snowflake.parse(snowflake);
      return true;
    } catch (_e) {
      return false;
    }
  }

  static extractBits(
    snowflake: SnowflakeResolvable,
    start: number,
    length?: number,
  ): number {
    return parseInt(
      length
        ? Snowflake.binary(snowflake).substring(start, start + length)
        : Snowflake.binary(snowflake).substring(start),
      2,
    );
  }

  static binary(snowflake: SnowflakeResolvable): string {
    const cached64BitZeros =
      '0000000000000000000000000000000000000000000000000000000000000000';
    const binValue = BigInt(snowflake).toString(2);

    return binValue.length < 64
      ? cached64BitZeros.substring(0, 64 - binValue.length) + binValue
      : binValue;
  }
}

type SnowflakeResolvable = string;

interface DeconstructedSnowflake {
  timestamp: number;
  shard_id: number;
  sequence: number;
  binary: string;
}
