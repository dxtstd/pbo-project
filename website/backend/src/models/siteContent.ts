import mongoose, { Document, Schema } from "mongoose";

export interface ISiteContent extends Document {
  key: string;
  siteName: string;
  heroTitle: string;
  heroDescription: string;
  facilitiesTitle: string;
  facilitiesDescription: string;
  contactTitle: string;
  contactDescription: string;
  location: string;
  whatsapp: string;
}

const SiteContentSchema = new Schema<ISiteContent>({
  key: { type: String, required: true, unique: true, default: "landing" },
  siteName: { type: String, required: true, default: "Kost Lorem Ipsum" },
  heroTitle: { type: String, required: true, default: "Kost Lorem Ipsum" },
  heroDescription: { type: String, required: true },
  facilitiesTitle: { type: String, required: true, default: "Fasilitas Kost Lorem Ipsum" },
  facilitiesDescription: { type: String, required: true },
  contactTitle: { type: String, required: true, default: "Contact Us" },
  contactDescription: { type: String, required: true },
  location: { type: String, required: true },
  whatsapp: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<ISiteContent>("SiteContent", SiteContentSchema);
