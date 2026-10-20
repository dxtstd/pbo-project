import React, { useState } from 'react';
import type { ContactformData } from '../types';

export const Contact = function ({ title, description, location, whatsapp }: { title?: string; description?: string; location?: string; whatsapp?: string }): React.ReactElement {
  const [formData, setFormData] = useState<ContactformData>({
    name: '',
    whatsapp: '',
    message: '',
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Contact data:', formData);
    alert('Pesan berhasil dikirim.');
  };

  return (
    <section id="contact" className="flex min-h-[calc(100dvh-76px)] scroll-mt-[76px] items-center justify-center px-4 py-12 sm:px-8 md:min-h-[calc(100dvh-88px)] md:scroll-mt-[88px] md:px-12 lg:px-16 xl:px-20">
      <div className="w-full max-w-5xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
        <div className="text-center">
          <h2 className="mb-2 font-serif text-2xl font-bold  text-[#4A3B32] sm:text-3xl">
          {title || "Contact Us"}
          </h2>
          <p className="mb-8 text-sm text-[#6C5A52]">
            {description || "Hubungi kami untuk informasi lebih lanjut mengenai Kost Lorem Ipsum."}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-white/80 p-6 shadow-md sm:p-8">
            <h3 className="mb-5 text-center text-sm font-semibold text-[#4A3B32]">Informasi Kontak</h3>
            <div className="space-y-5 text-sm text-[#6C5A52]">
              <div>
                <p className="font-semibold text-[#4A3B32]">Lokasi</p>
                <p className="mt-1">{location || "Tataaran Satu, Kec. Tondano Sel., Kabupaten Minahasa, Sulawesi Utara, Indonesia"}</p>
              </div>
              <div>
                <p className="font-semibold text-[#4A3B32]">WhatsApp</p>
                <p className="mt-1">{whatsapp || "+62 813-9991-2220"}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white/80 p-6 shadow-md sm:p-8">
            <h3 className="mb-5 text-center text-sm font-semibold text-[#4A3B32]">Formulir Tanya</h3>
            <input
              type="text"
              placeholder="Nama Lengkap"
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className="w-full rounded border border-[#D3C5B4] bg-white px-3 py-2 text-sm focus:border-[#5C4033] focus:outline-none"
              required
            />
            <input
              type="tel"
              placeholder="Nomor WhatsApp"
              value={formData.whatsapp}
              onChange={(event) => setFormData({ ...formData, whatsapp: event.target.value })}
              className="w-full rounded border border-[#D3C5B4] bg-white px-3 py-2 text-sm focus:border-[#5C4033] focus:outline-none"
              required
            />
            <textarea
              placeholder="Pesan / Pertanyaan"
              value={formData.message}
              onChange={(event) => setFormData({ ...formData, message: event.target.value })}
              className="min-h-24 w-full resize-none rounded border border-[#D3C5B4] bg-white px-3 py-2 text-sm focus:border-[#5C4033] focus:outline-none"
              required
            />
            <button
              type="submit"
              className="block rounded bg-[#5C4033] px-6 py-2 text-sm text-white shadow transition hover:bg-[#4A3B32] md:mx-auto"
            >
              Kirim
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};