export function ApiLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#efe2d6] px-6 text-[#694536]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#d8b5a4] border-t-[#694536]" />
        <p className="mt-5 text-lg font-semibold">Mohon menunggu</p>
        <p className="mt-1 text-sm text-[#765e52]">Menghubungkan ke server...</p>
      </div>
    </main>
  );
}
