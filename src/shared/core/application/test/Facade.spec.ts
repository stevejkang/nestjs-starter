import { Facade } from '../Facade';

class StubFacade extends Facade {
  greet(name: string): string {
    return `hello ${name}`;
  }
}

describe('Facade', () => {
  it('can be extended and instantiated', () => {
    const facade = new StubFacade();

    expect(facade).toBeInstanceOf(StubFacade);
    expect(facade).toBeInstanceOf(Facade);
  });

  it('delegates to concrete methods defined by subclasses', () => {
    const facade = new StubFacade();

    expect(facade.greet('world')).toBe('hello world');
  });

  it('can be used as a NestJS provider type reference', () => {
    const providers: Array<{ provide: typeof Facade; useClass: typeof StubFacade }> = [
      { provide: Facade, useClass: StubFacade },
    ];
    const entry = providers[0]!;

    expect(entry.provide).toBe(Facade);
    expect(entry.useClass).toBe(StubFacade);
  });
});
