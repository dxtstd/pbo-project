import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  roomId: string;
  ownerId?: string;
  customerId: string;
  rentalStartDate?: Date;
  monthlyDueDay?: number;
  name: string;
  type: string;
  price: number;
  withFurniture: boolean;
  isOccupied: boolean;
}

const RoomSchema: Schema = new Schema({
  roomId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: false, default: undefined, index: true },
  customerId: { type: String, required: false, default: undefined, index: true },
  rentalStartDate: { type: Date, required: false },
  monthlyDueDay: { type: Number, required: false, min: 1, max: 31 },
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  withFurniture: { type: Boolean, required: true, default: false },
  isOccupied: { type: Boolean, required: true, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

RoomSchema.virtual('owner', {
  ref: 'Owner',
  localField: 'ownerId',
  foreignField: 'ownerId',
  justOne: true,
});

RoomSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: 'customerId',
  justOne: true,
});

RoomSchema.virtual('invoices', {
  ref: 'Invoice',
  localField: 'roomId',
  foreignField: 'roomId',
});

RoomSchema.virtual('transactions', {
  ref: 'Transaction',
  localField: 'roomId',
  foreignField: 'roomId',
});

export default mongoose.model<IRoom>('Room', RoomSchema);