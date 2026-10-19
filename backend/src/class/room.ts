import type Customer from './customer';
import type Owner from './owner';

export type RoomType = 'standard' | 'deluxe' | 'suite';

export interface RoomOptions {
  roomId: string;
  name: string;
  type: RoomType;
  price: number;
  withFurniture?: boolean;
  owner?: Owner;
  customer?: Customer;
}

export default class Room {
  private customer?: Customer;
  private readonly owner?: Owner;
  private occupied: boolean;

  public constructor(private readonly options: RoomOptions) {
    if (!options.roomId || !options.name || options.price < 0) {
      throw new Error('Data kamar tidak valid');
    }
    this.customer = options.customer;
    this.owner = options.owner;
    this.occupied = Boolean(options.customer);
  }

  public assignCustomer(customer: Customer): void {
    if (this.occupied) throw new Error('Kamar sudah ditempati');
    this.customer = customer;
    this.occupied = true;
    customer.addRoom(this);
  }

  public vacate(): void {
    this.customer = undefined;
    this.occupied = false;
  }

  public isOccupied(): boolean {
    return this.occupied;
  }

  public getMonthlyPrice(): number {
    return this.options.price;
  }

  public calculatePrice(months = 1): number {
    if (!Number.isInteger(months) || months < 1) {
      throw new Error('Jumlah bulan harus berupa bilangan bulat positif');
    }
    return this.getMonthlyPrice() * months;
  }

  public getCustomer(): Customer | undefined {
    return this.customer;
  }

  public getOwner(): Owner | undefined {
    return this.owner;
  }

  public getDetails(): Readonly<RoomOptions & { isOccupied: boolean }> {
    return { ...this.options, isOccupied: this.occupied };
  }
}
