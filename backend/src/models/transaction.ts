import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  transactionId: string;
  customerId: string;
  roomId: string;
  invoiceNumber?: string;
  paymentMethod: 'QRIS' | 'Bank Transfer' | 'Card' | 'Cash';
  paymentDate: Date;
  totalAmount: number;
}

const TransactionSchema: Schema = new Schema({
  transactionId: { type: String, required: true, unique: true },
  customerId: { type: String, required: true },
  roomId: { type: String, required: true },
  invoiceNumber: { type: String, required: false, index: true },
  paymentMethod: { type: String, required: true, enum: ['QRIS', 'Bank Transfer', 'Card', 'Cash'] },
  paymentDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

TransactionSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: 'customerId',
  justOne: true,
});

TransactionSchema.virtual('room', {
  ref: 'Room',
  localField: 'roomId',
  foreignField: 'roomId',
  justOne: true,
});

TransactionSchema.virtual('invoice', {
  ref: 'Invoice',
  localField: 'invoiceNumber',
  foreignField: 'invoiceNumber',
  justOne: true,
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);