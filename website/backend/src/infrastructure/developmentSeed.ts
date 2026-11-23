import SiteContent from "../models/siteContent";

export const seedDevelopmentContent = async (): Promise<void> => {
  if (process.env.NODE_ENV === "production") return;

  await SiteContent.updateOne(
    { key: "landing" },
    {
      $setOnInsert: {
        key: "landing",
        siteName: "Kost Camp M2",
        heroTitle: "Kost Camp M2",
        heroDescription: "Tinggal dengan suasana nyaman di Kost Camp M2. Lokasi strategis dengan fasilitas lengkap untuk kenyamanan dan ketenangan Anda.",
        facilitiesTitle: "Fasilitas Kost Camp M2",
        facilitiesDescription: "Nikmati fasilitas lengkap yang dirancang untuk mendukung aktivitas harian, kenyamanan, dan ketenangan Anda.",
        contactTitle: "Contact Us",
        contactDescription: "Hubungi kami untuk informasi lebih lanjut mengenai Kost Camp M2.",
        location: "Tataaran Satu, Kec. Tondano Sel., Kabupaten Minahasa, Sulawesi Utara, Indonesia",
        whatsapp: "+62 813-9991-2220",
      },
    },
    { upsert: true },
  );
};
