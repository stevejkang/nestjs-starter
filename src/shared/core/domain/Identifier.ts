export class Identifier<T> {
  constructor(private readonly value: T) {}

  equals(id?: Identifier<T>): boolean {
    if (!id) {
      return false;
    }

    if (!(id instanceof Identifier)) {
      return false;
    }

    return id.toValue() === this.value;
  }

  toString(): string {
    return String(this.value);
  }

  toNumber(): number {
    return Number(this.value);
  }

  toValue(): T {
    return this.value;
  }

  isNewIdentifier(): boolean {
    return this.value === 0;
  }
}
