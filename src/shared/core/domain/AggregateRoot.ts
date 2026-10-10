import { DomainEvent } from './DomainEvent';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UniqueEntityID } from './UniqueEntityID';

interface AggregateObjectProps {
  [index: string]: any;
}

export abstract class AggregateRoot<T extends AggregateObjectProps> {
  public readonly props: T;
  private readonly _id: UniqueEntityID;
  private _domainEvents: DomainEvent[] = [];

  protected constructor(props: T, id?: UniqueEntityID) {
    this.props = { ...props };
    this._id = id ? id : new UniqueEntityID();
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
