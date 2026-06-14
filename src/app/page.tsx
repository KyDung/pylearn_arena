import Image from "next/image";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="px-4 sm:px-8 lg:px-16 py-12 sm:py-16 lg:py-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <p className="text-[#ff7a50] font-semibold mb-3 sm:mb-4 text-sm sm:text-base">
              Python x Game x Thực hành
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 font-[family-name:var(--font-space-grotesk)] leading-tight">
              Học Python qua các mini-game ngắn, tập trung.
            </h1>
          </div>

          <div className="relative aspect-[1024/559] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <Image
              src="/thumbnail.jpg"
              alt="Học Python qua trò chơi"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
