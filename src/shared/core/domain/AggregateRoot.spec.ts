import { AggregateRoot } from './AggregateRoot';
import { UniqueEntityID } from './UniqueEntityID';
import { DomainEvent, BaseDomainEvent } from './DomainEvent';

interface AggregateObjectProps {
  foo: string;
}

class TestEvent extends BaseDomainEvent {
  constructor(aggregateId: UniqueEntityID) {
    super(aggregateId, 'TestEvent');
  }
}

class TestAggregate extends AggregateRoot<AggregateObjectProps> {
  constructor(props: AggregateObjectProps, id?: UniqueEntityID) {
    super(props, id);
  }

  emitTestEvent(): void {
    this.addDomainEvent(new TestEvent(this.id));
  }
}

describe('AggregateRoot', () => {
  it('should be defined', () => {
    expect(TestAggregate).toBeDefined();
  });

  it('should return id when provided', () => {
    const aggregate = new TestAggregate({ foo: 'bar' }, new UniqueEntityID(1));
    expect(aggregate.id).toBeDefined();
    expect(aggregate.id.toValue()).toEqual(1);
  });

  it('should generate id when not provided', () => {
    const aggregate = new TestAggregate({ foo: 'bar' });
    expect(aggregate.id).toBeDefined();
  });

  it('should store props immutably', () => {
    const props = { foo: 'bar' };
    const aggregate = new TestAggregate(props);
    props.foo = 'mutated';
    expect(aggregate.props.foo).toBe('bar');
  });

  describe('domain events', () => {
    it('should start with no domain events', () => {
      const aggregate = new TestAggregate({ foo: 'bar' });
      expect(aggregate.domainEvents).toEqual([]);
    });

    it('should add domain event via addDomainEvent', () => {
      const aggregate = new TestAggregate({ foo: 'bar' }, new UniqueEntityID(42));
      aggregate.emitTestEvent();

      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0]?.eventType).toBe('TestEvent');
      expect(aggregate.domainEvents[0]?.aggregateId.toValue()).toBe(42);
      expect(aggregate.domainEvents[0]?.occurredAt).toBeInstanceOf(Date);
    });

    it('should accumulate multiple domain events', () => {
      const aggregate = new TestAggregate({ foo: 'bar' });
      aggregate.emitTestEvent();
      aggregate.emitTestEvent();
      aggregate.emitTestEvent();

      expect(aggregate.domainEvents).toHaveLength(3);
    });

    it('should clear all domain events', () => {
      const aggregate = new TestAggregate({ foo: 'bar' });
      aggregate.emitTestEvent();
      aggregate.emitTestEvent();
      expect(aggregate.domainEvents).toHaveLength(2);

      aggregate.clearEvents();
      expect(aggregate.domainEvents).toEqual([]);
    });

    it('should return readonly array from domainEvents', () => {
      const aggregate = new TestAggregate({ foo: 'bar' });
      aggregate.emitTestEvent();

      const events = aggregate.domainEvents;
      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(1);
    });
  });
});
