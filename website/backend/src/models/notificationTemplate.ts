import mongoose, { Document, Schema } from "mongoose";

/** Admin-configured WhatsApp message template with supported event placeholders. */
export interface INotificationTemplate extends Document {
  ownerId: string;
  event: string;
  name: string;
  content: string;
  active: boolean;
}

const NotificationTemplateSchema = new Schema<INotificationTemplate>({
  ownerId: { type: String, required: true, index: true },
  event: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<INotificationTemplate>("NotificationTemplate", NotificationTemplateSchema);
