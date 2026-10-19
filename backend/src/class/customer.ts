import { Person } from './person';
import type Room from './room';
import type Invoice from './invoice';

export default class Customer extends Person {
  private readonly rooms: Room[] = [];
  private readonly invoices: Invoice[] = [];

  public constructor(
    customerId: string,
    username: string,
    firstname: string,
    lastname: string,
    phoneNumber: string,
  ) {
    super(customerId, username, firstname, lastname, phoneNumber);
  }

  public addRoom(room: Room): void {
    if (!this.rooms.includes(room)) this.rooms.push(room);
  }

  public addInvoice(invoice: Invoice): void {
    if (!this.invoices.includes(invoice)) this.invoices.push(invoice);
  }

  public getRooms(): readonly Room[] {
    return this.rooms;
  }

  public getInvoices(): readonly Invoice[] {
    return this.invoices;
  }
}