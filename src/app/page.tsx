export default function Home() {
  return (
    <main className="flex-1">
      <section className="px-16 py-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#ff7a50] font-semibold mb-4">
              Python x Game x Thực hành
            </p>
            <h1 className="text-5xl font-bold mb-6 font-[family-name:var(--font-space-grotesk)]">
              Học Python qua các mini-game ngắn, tập trung.
            </h1>
            <p className="text-lg text-gray-700 mb-8">
              Mỗi bài học là một mini-game. Mục tiêu rõ ràng, phản hồi tức thì,
              lộ trình từ cơ bản đến xây dựng dự án.
            </p>
            <div className="flex gap-4 mb-8">
              <a
                href="/game"
                className="px-6 py-3 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-colors"
              >
                Chơi bài đầu tiên
              </a>
              <a
                href="/game"
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-white transition-colors"
              >
                Xem lộ trình
              </a>
            </div>
            <div className="flex gap-8">
              <div>
                <div className="text-3xl font-bold">3</div>
                <div className="text-gray-600">Khóa học</div>
              </div>
              <div>
                <div className="text-3xl font-bold">24</div>
                <div className="text-gray-600">Bài học</div>
              </div>
              <div>
                <div className="text-3xl font-bold">Demo</div>
                <div className="text-gray-600">Tài khoản mock</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold mb-4">Thử thách hôm nay</h3>
            <p className="text-gray-700 mb-6">
              Dùng vòng lặp để tự động sửa cầu và mở bản đồ tiếp theo.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Mục tiêu</span>
                <span className="font-semibold">Sửa 5 ô</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kỹ năng</span>
                <span className="font-semibold">for / while</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian</span>
                <span className="font-semibold">6 phút</span>
              </div>
            </div>
            <a
              href="/game"
              className="block w-full text-center px-6 py-3 bg-[#ff7a50] text-white rounded-lg font-medium hover:bg-[#ff6940] transition-colors"
            >
              Xếp hàng nhiệm vụ
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
