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
  status: 'paid' | 'pending' | 'unpaid' | 'overdue' | 'cancelled';
  customerName: string;
  roomName: string;
  periodStartDate?: Date;
  periodEndDate?: Date;
  periodMonths: number;
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
  status: { type: String, required: true, enum: ['paid', 'pending', 'unpaid', 'overdue', 'cancelled'], default: 'unpaid' },
  customerName: { type: String, required: false, default: "" },
  roomName: { type: String, required: false, default: "" },
  periodStartDate: { type: Date, required: false },
  periodEndDate: { type: Date, required: false },
  periodMonths: { type: Number, required: true, min: 1, max: 12, default: 1 },
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