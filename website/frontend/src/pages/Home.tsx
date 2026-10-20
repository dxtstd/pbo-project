import React, { useEffect, useState } from 'react';
import { Facilities } from './Facilities';
import { Contact } from './Contact';

export const Home = function (): React.ReactElement {
  const [content, setContent] = useState<{ siteName: string; heroTitle: string; heroDescription: string; facilitiesTitle: string; facilitiesDescription: string; contactTitle: string; contactDescription: string; location: string; whatsapp: string }>();
  useEffect(() => {
    fetch("/api/v1/site-content")
      .then((response) => response.ok ? response.json() as Promise<{ content?: typeof content }> : Promise.reject())
      .then((result) => { if (result.content) setContent(result.content); })
      .catch(() => undefined);
  }, []);
  return (
    <div>
      <section id="home" className="flex min-h-[calc(100dvh-76px)] scroll-mt-[76px] items-center px-4 py-8 sm:px-8 md:min-h-[calc(100dvh-88px)] md:scroll-mt-[88px] md:px-12 lg:px-16 xl:px-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 rounded-xl bg-[#F5EBE6] px-4 py-8 sm:px-8 md:flex-row md:justify-between md:gap-12 md:px-12 md:py-12 lg:max-w-[1100px] lg:gap-12 lg:px-12 lg:py-12 xl:max-w-[1350px] xl:gap-16 xl:px-16 xl:py-16 2xl:max-w-[1550px] 2xl:gap-24 2xl:px-24 2xl:py-20">
          <div className="relative w-full max-w-xl shrink-0 md:self-start lg:max-w-[480px] xl:max-w-[600px] 2xl:max-w-[720px]">
            <img src="/img/kost.png" alt="Kost Lorem Ipsum" className="aspect-[16/10] w-full rounded-lg object-contain" />
          </div>
          <div className="w-full max-w-xl space-y-5 text-center md:text-left lg:max-w-xl lg:space-y-5 xl:max-w-2xl xl:space-y-7 2xl:max-w-3xl">
            <h1 className="font-serif text-3xl  font-bold text-[#4A3B32] sm:text-4xl lg:text-4xl xl:text-5xl 2xl:text-6xl">{content?.heroTitle || "Kost Lorem Ipsum"}</h1>
            <p className="text-sm leading-relaxed text-[#6B5B52] lg:text-base xl:text-lg">
              {content?.heroDescription || "Tinggal dan suasana yang nyaman di Kost Lorem Ipsum. Lokasi strategis dengan fasilitas lengkap yang dirancang untuk memberikan kenyamanan dan ketenangan Anda."}
            </p>
            <button
              onClick={() => { window.location.href = "/login" }}
              className="bg-[#5C4033] text-white px-6 py-2.5 rounded-md hover:bg-[#4A3B32] transition shadow"
            >
              Log In
            </button>
          </div>
        </div>
      </section>
      <Facilities title={content?.facilitiesTitle} description={content?.facilitiesDescription} />
      <Contact title={content?.contactTitle} description={content?.contactDescription} location={content?.location} whatsapp={content?.whatsapp} />
    </div>
  );
};