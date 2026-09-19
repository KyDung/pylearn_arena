# Kiểm thử trên trình duyệt

Bốn file `.cjs` ở đây là kịch bản QA chạy bằng Playwright, viết trong đợt 5 để kiểm chứng những
thứ mà `tsc`, ESLint và test foundation **không** bắt được: hành vi của React effect khi trang
chạy thật.

Mỗi file xuất một hàm `async (page) => {...}` nhận đối tượng `page` của Playwright và trả về kết
quả dạng JSON. Chúng **không** phải test runner: dự án chưa cài Playwright làm dependency, nên
muốn chạy thì nạp hàm đó vào một driver Playwright có sẵn.

## Chúng kiểm tra gì

| File | Kiểm tra |
| --- | --- |
| `hooks-qa.cjs` | Nạp 15 trang theo từng vai trò, giả lập toàn bộ API. Đếm số request lúc trang đã đứng yên, để bắt vòng lặp gọi API vô hạn. Bắt cả lỗi JavaScript và trang kẹt ở trạng thái "Đang tải". |
| `hooks-interaction-qa.cjs` | Gõ tìm kiếm liên tiếp để xác nhận kết quả cũ bị huỷ chứ không ghi đè kết quả mới. Kiểm tra đồng hồ đếm ngược, chuyển hướng khi sai vai trò, và chuyển hướng khi phiên hết hạn. |
| `game-qa.cjs` | Mở game id2 với API giả, đợi trình soạn code sẵn sàng. |
| `game-run-qa.cjs` | Đo chiều rộng khung code và khung game trước và sau khi chạy code, trong đó có một đoạn cố ý in 400 ký tự liền không dấu cách. Đây là đầu vào tệ nhất cho lỗi nhảy khung đã sửa ở đợt 2. |

## Vì sao giữ lại

Đây là lớp kiểm chứng duy nhất chạm tới hành vi phía trình duyệt. Ba đợt trước phải để lại 35 mục
lint vì không có cách nào xác nhận rằng sửa chúng không tạo vòng lặp gọi API. Bốn file này chính là
cách đó. Ảnh chụp và log do chúng sinh ra nằm ở `output/playwright/` và `.playwright-cli/`, cả hai
thư mục đều bị Git bỏ qua vì là kết quả chạy, không phải mã nguồn.
