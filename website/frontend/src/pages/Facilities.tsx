import React from "react";

// interface FacilityItem {
//     id: number;
//     title: string;
//     img: string;
// }

// const facilitiesData: FacilityItem[] = [    
//     { id: 1, title: "Faselitas", img: "/img/facilites.png" },
// ];

export const Facilities = function ({ title, description }: { title?: string; description?: string }): React.ReactElement {
  return (
    <section id="facilities" className="flex min-h-[calc(100dvh-76px)] scroll-mt-[76px] items-center px-4 py-12 sm:px-8 md:min-h-[calc(100dvh-88px)] md:scroll-mt-[88px] md:px-12 lg:px-16 xl:px-20">
      <div className="mx-auto w-full max-w-7xl lg:max-w-[1120px] xl:max-w-[1300px] 2xl:max-w-[1500px]">
        {/* Header */}
        <div className="mb-8 max-w-2xl">
          <h1 className="mb-2 font-serif text-2xl font-bold text-[#4A3B32] sm:text-3xl">
          {title || "Fasilitas Kost Camp M2"}
          </h1>
          <p className="text-sm text-[#6C5A52]">
            {description || "Nikmati kenyamanan tinggal di Kost Camp M2 dengan fasilitas lengkap yang dirancang untuk mendukung aktivitas harian, kenyamanan, dan ketenangan Anda."}
          </p>
        </div>

        {/* Grid 4 Kolom Sejajar (grid-cols-1 di HP, sm:grid-cols-2 di tablet, lg:grid-cols-4 di laptop) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 xl:gap-10 2xl:gap-12">
           <div className="overflow-hidden rounded-xl shadow-md">
            <img src="/img/facilities5.png" alt="Fasilitas 1" className="aspect-square w-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-xl shadow-md">
            <img src="/img/facilities2.png" alt="Fasilitas 2" className="aspect-square w-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-xl shadow-md">
            <img src="/img/facilities6.png" alt="Fasilitas 3" className="aspect-square w-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-xl shadow-md">
            <img src="/img/facilities7.png" alt="Fasilitas 4" className="aspect-square w-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};