# FuOverflow MLN122 Pro 🎓

> **Chrome Extension hỗ trợ học và luyện đề môn MLN122 trên nền tảng FuOverflow (fuoverflow.com)**  
> *Dev by **thanh duyvp***

---

## 🌟 Tính Năng Nổi Bật

- 📸 **Tải Ảnh Gốc Full HD:** Tự động lấy trực tiếp ảnh gốc độ phân giải cao của từng câu hỏi đính kèm trong bài viết, không còn tình trạng mờ hay vỡ hạt.
- 🔴 **Đáp Án Cộng Đồng Tự Động (ĐA Đỏ):** Tự động quét và tổng hợp các bình luận, phản hồi của cộng đồng để trích xuất đáp án được thống nhất nhiều nhất, hiển thị nổi bật với màu đỏ to rõ.
- ✔️ **Đánh Dấu "Đã Học" Thông Minh:** 
  - Đánh dấu từng câu hỏi hoặc cả đề thi.
  - Hiển thị tiến độ hoàn thành (badge % hoàn thành) ngay tại trang danh sách đề của diễn đàn.
  - Tự động đồng bộ và lưu trữ qua `chrome.storage.local` và `localStorage`.
- 🎯 **Tự Động Căn Giữa Màn Hình (Auto-center):** Nhấn phím mũi tên `↓` hoặc `↑` để di chuyển giữa các câu, tiện ích sẽ tự động cuộn và căn câu hỏi vào chính giữa khung nhìn màn hình giúp việc làm bài nhanh và tập trung nhất.
- 🔍 **Đồng Bộ Phóng To (Global Zoom):** Cho phép phóng to/thu nhỏ đồng loạt tất cả ảnh (100%, 140%, 175%...) chỉ với một thao tác.
- ↕️ **Tối Ưu Chiều Cao Khung Ảnh:** Cắt bớt các khoảng trắng thừa dưới ảnh đề thi với các mức chiều cao định sẵn (Gọn 240px, Chuẩn 290px, 360px, Mở rộng 480px).
- 💾 **Xuất Dữ Liệu JSON:** Hỗ trợ lưu trữ offline dữ liệu đề thi kèm đáp án cộng đồng ra file JSON.

---

## 🚀 Hướng Dẫn Cài Đặt (Dành Cho Người Dùng)

Tiện ích hoạt động trên các trình duyệt nền tảng Chromium như **Google Chrome**, **Microsoft Edge**, **Cốc Cốc**, **Brave**, **Opera**,...

### Bước 1: Tải mã nguồn về máy
1. Nhấn vào nút xanh **`Code`** ở đầu trang GitHub này.
2. Chọn **`Download ZIP`**.
3. Giải nén file `.zip` vừa tải về vào một thư mục trên máy tính của bạn.

*(Hoặc dùng Git: `git clone https://github.com/thanhduykx/fuoverflow-mln122-extension.git`)*

### Bước 2: Bật chế độ nhà phát triển (Developer Mode) trên trình duyệt
1. Mở trình duyệt (Chrome, Edge hoặc Cốc Cốc).
2. Truy cập vào trang quản lý tiện ích:
   - Trên Chrome/Cốc Cốc/Brave: Gõ `chrome://extensions` vào thanh địa chỉ và nhấn Enter.
   - Trên Edge: Gõ `edge://extensions` vào thanh địa chỉ và nhấn Enter.
3. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.

### Bước 3: Cài đặt tiện ích
1. Nhấn vào nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
2. Chọn thư mục `fuoverflow-mln122-extension` (thư mục chứa file `manifest.json`).
3. Tiện ích **FuOverflow MLN122 Pro** sẽ xuất hiện trong danh sách và sẵn sàng hoạt động!

---

## 📖 Hướng Dẫn Sử Dụng

1. Truy cập vào trang web [fuoverflow.com](https://fuoverflow.com).
2. **Tại trang danh sách diễn đàn (`/forums/`):** 
   - Tiện ích sẽ tự động gắn nhãn tiến độ học tập bên cạnh tên đề.
   - Có thể bấm nút `✔ Tick đã học đề này` để đánh dấu nhanh.
3. **Tại trang chi tiết đề thi (`/threads/`):**
   - Nút nổi **`🎓 Mở Tool MLN122 (Ảnh Full HD + ĐA Đỏ)`** sẽ xuất hiện ở góc dưới bên phải màn hình.
   - Nhấn vào nút này để mở giao diện học tập chuyên nghiệp toàn màn hình.
   - Dùng phím mũi tên `↓` và `↑` để di chuyển câu hỏi với chế độ tự động căn giữa màn hình.

---

## 📂 Cấu Trúc Dự Án

```
fuoverflow-mln122-extension/
├── manifest.json       # Cấu hình Chrome Extension (Manifest V3)
├── content.js          # Core logic (quét ảnh HD, đáp án cộng đồng, điều hướng, lưu trữ)
├── style.css           # Giao diện Dark theme tối ưu trải nghiệm học tập
├── icon16.png          # Icon kích thước 16x16
├── icon48.png          # Icon kích thước 48x48
├── icon128.png         # Icon kích thước 128x128
├── README.md           # Hướng dẫn chi tiết
└── LICENSE             # Giấy phép nguồn mở MIT
```

---

## 👨‍💻 Tác Giả & Bản Quyền

- **Developer:** `thanh duyvp`
- **License:** [MIT License](LICENSE)
