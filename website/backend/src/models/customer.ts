import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  customerId: string;
  ownerId?: string;
  username: string;
  firstname: string;
  lastname: string;
  phoneNumber: string;
  password: string;
}

const CustomerSchema: Schema = new Schema({
  customerId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: false, index: true },
  username: { type: String, required: true, unique: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  password: { type: String, required: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

CustomerSchema.virtual('rooms', {
  ref: 'Room',
  localField: 'customerId',
  foreignField: 'customerId',
});

CustomerSchema.virtual('invoices', {
  ref: 'Invoice',
  localField: 'customerId',
  foreignField: 'customerId',
});

CustomerSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: 'customerId',
  foreignField: 'customerId',
});

export default mongoose.model<ICustomer>('Customer', CustomerSchema);