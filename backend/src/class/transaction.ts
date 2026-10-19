import type Customer from './customer';
import type Invoice from './invoice';
import type Room from './room';

export type PaymentMethod = 'QRIS' | 'Bank Transfer' | 'Card' | 'Cash';

export default class Transaction {
  public readonly paymentDate: Date;

  public constructor(
    private readonly transactionId: string,
    private readonly customer: Customer,
    private readonly room: Room,
    private readonly totalAmount: number,
    private readonly paymentMethod: PaymentMethod,
    private readonly invoice?: Invoice,
    paymentDate = new Date(),
  ) {
    if (!transactionId || totalAmount < 0) throw new Error('Data transaksi tidak valid');
    this.paymentDate = paymentDate;
  }

  public getSummary(): Readonly<Record<string, unknown>> {
    return {
      transactionId: this.transactionId,
      customerId: this.customer.getId(),
      roomId: this.room.getDetails().roomId,
      invoiceNumber: this.invoice?.getDetails().invoiceNumber,
      paymentMethod: this.paymentMethod,
      paymentDate: this.paymentDate,
      totalAmount: this.totalAmount,
    };
  }
}