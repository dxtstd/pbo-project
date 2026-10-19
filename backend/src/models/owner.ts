  import mongoose, { Schema, Document } from 'mongoose';

  export interface IOwner extends Document {
    ownerId: string;
    username: string;
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string;
    password: string;
  }

  const OwnerSchema: Schema = new Schema({
    ownerId: { type: String, required: true, unique: true },
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

  OwnerSchema.virtual('rooms', {
    ref: 'Room',
    localField: 'ownerId',
    foreignField: 'ownerId',
  });

  export default mongoose.model<IOwner>('Owner', OwnerSchema);