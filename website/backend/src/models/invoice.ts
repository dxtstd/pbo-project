import mongoose, { Schema, Document } from 'mongoose';

/** Persisted invoice data, including immutable billing snapshots. */
export interface IInvoice extends Document {
  invoiceNumber: string;
  customerId: string;
  roomId: string;
  basePrice: number;
  additionalFees: number;
  totalAmount: number;
  amount: number;
  dueDate: Date;
  status: 'paid' | 'unpaid' | 'overdue';
}

const InvoiceSchema: Schema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  customerId: { type: String, required: true, index: true },
  roomId: { type: String, required: true, index: true },
  basePrice: { type: Number, required: true, min: 0 },
  additionalFees: { type: Number, required: true, min: 0, default: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, required: true, enum: ['paid', 'unpaid', 'overdue'], default: 'unpaid' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

InvoiceSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: 'customerId',
  justOne: true,
});

InvoiceSchema.virtual('room', {
  ref: 'Room',
  localField: 'roomId',
  foreignField: 'roomId',
  justOne: true,
});

InvoiceSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: 'invoiceNumber',
  foreignField: 'invoiceNumber',
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);