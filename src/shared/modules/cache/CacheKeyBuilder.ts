function serializeArg(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
  if (typeof value === 'symbol' || typeof value === 'function') return String(value);

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  const sorted = sortObjectKeys(value as Record<string, unknown>);
  return JSON.stringify(sorted);
}

function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj).sort()) {
    const val = obj[key];
    result[key] =
      val !== null && typeof val === 'object' && !Array.isArray(val)
        ? sortObjectKeys(val as Record<string, unknown>)
        : val;
  }

  return result;
}

export function buildCacheKey(prefix: string, args: unknown[], keyArgs?: number[]): string {
  const selectedArgs = keyArgs ? keyArgs.filter((i) => i < args.length).map((i) => args[i]) : args;

  if (selectedArgs.length === 0) return prefix;

  const serialized = selectedArgs.map(serializeArg);
  return `${prefix}:${serialized.join(':')}`;
}
