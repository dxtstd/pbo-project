import type Customer from './customer';
import type Room from './room';

export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue';

export default class Invoice {
  private status: InvoiceStatus = 'unpaid';

  public constructor(
    private readonly invoiceNumber: string,
    private readonly customer: Customer,
    private readonly room: Room,
    private readonly amount: number,
    private readonly dueDate: Date,
  ) {
    if (!invoiceNumber || amount < 0) throw new Error('Data tagihan tidak valid');
    customer.addInvoice(this);
  }

  public pay(): void {
    if (this.status === 'paid') throw new Error('Tagihan sudah dibayar');
    this.status = 'paid';
  }

  public markOverdue(referenceDate = new Date()): void {
    if (this.status !== 'paid' && referenceDate > this.dueDate) this.status = 'overdue';
  }

  public getStatus(): InvoiceStatus {
    return this.status;
  }

  public getAmount(): number {
    return this.amount;
  }

  public getDetails(): Readonly<Record<string, unknown>> {
    return {
      invoiceNumber: this.invoiceNumber,
      customerId: this.customer.getId(),
      roomId: this.room.getDetails().roomId,
      amount: this.amount,
      dueDate: this.dueDate,
      status: this.status,
    };
  }
}