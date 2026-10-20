  import mongoose, { Schema, Document } from 'mongoose';

  export interface IOwner extends Document {
    ownerId: string;
    username: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string;
    notificationPhone?: string;
    notificationPreferences: {
      invoice_created: boolean;
      invoice_due: boolean;
      cash_requested: boolean;
      payment_received: boolean;
      extension_requested: boolean;
    };
    password: string;
  }

  const OwnerSchema: Schema = new Schema({
    ownerId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phoneNumber: { type: String, required: true },
    notificationPhone: { type: String, required: false },
    notificationPreferences: {
      invoice_created: { type: Boolean, default: true },
      invoice_due: { type: Boolean, default: true },
      cash_requested: { type: Boolean, default: true },
      payment_received: { type: Boolean, default: true },
      extension_requested: { type: Boolean, default: true },
    },
    password: { type: String, required: true },
  }, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  OwnerSchema.virtual('rooms', {
    ref: 'Room',
    localField: 'ownerId',
    foreignField: 'ownerId',
  });

  export default mongoose.model<IOwner>('Owner', OwnerSchema);