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
            <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed">
              Mỗi bài học là một mini-game. Mục tiêu rõ ràng, phản hồi tức thì,
              lộ trình từ cơ bản đến xây dựng dự án.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
              <a
                href="/game"
                className="px-6 py-3 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-all hover:shadow-lg text-center"
              >
                Chơi bài đầu tiên
              </a>
              <a
                href="/game"
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-white hover:border-gray-400 transition-all text-center"
              >
                Xem lộ trình
              </a>
            </div>
            <div className="flex flex-wrap gap-6 sm:gap-8 justify-center sm:justify-start">
              <div className="text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-[#ff7a50]">
                  3
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  Khóa học
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-[#1f87ff]">
                  24
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  Bài học
                </div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-[#f6b73c]">
                  Demo
                </div>
                <div className="text-sm sm:text-base text-gray-600">
                  Tài khoản mock
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">
              Thử thách hôm nay
            </h3>
            <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 leading-relaxed">
              Dùng vòng lặp để tự động sửa cầu và mở bản đồ tiếp theo.
            </p>
            <div className="space-y-3 mb-4 sm:mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600">
                  Mục tiêu
                </span>
                <span className="font-semibold text-sm sm:text-base">
                  Sửa 5 ô
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600">
                  Kỹ năng
                </span>
                <span className="font-semibold text-sm sm:text-base">
                  for / while
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm sm:text-base text-gray-600">
                  Thời gian
                </span>
                <span className="font-semibold text-sm sm:text-base">
                  6 phút
                </span>
              </div>
            </div>
            <a
              href="/game"
              className="block w-full text-center px-6 py-3 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-all hover:shadow-lg"
            >
              Xếp hàng nhiệm vụ
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
