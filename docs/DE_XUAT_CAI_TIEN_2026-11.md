# Violette Train — Rà soát & đề xuất cải tiến (14/11/2026)

Phạm vi: website khách hàng (ảnh cabin, giá, đặt vé, thanh toán) và trang quản trị.
Mọi phát hiện dưới đây đã được kiểm chứng trên code và, khi có thể, chạy thử trên Supabase local.

---

## 1. Tóm tắt

- **Đã làm xong:** trang admin mới **“Lịch chạy & giá vé”** (`/admin/calendar`), cho người không biết code đặt lịch chạy, giá theo từng ngày và mở/tạm ngưng bán bằng lịch tháng.
- **Đã sửa 6 lỗi nghiêm trọng** tìm thấy khi rà soát. Lỗi lớn nhất: **khách đặt vé một chiều không thể thanh toán** (hàm giữ chỗ trong database báo lỗi).
- **Còn lại:** khoảng 30 đề xuất, xếp theo mức ưu tiên ở mục 3. Trong đó có **5 việc nên làm trước khi bán vé thật** (P0).

---

## 2. Đã thực hiện trong đợt này

### 2.1 Trang admin “Lịch chạy & giá vé” — `/admin/calendar`

Trang này thay `/admin/operations` làm trang mặc định sau khi đăng nhập.

| Nhu cầu của admin | Cách làm trên giao diện |
|---|---|
| Xem cả tháng đang bán gì, giá bao nhiêu | Lịch tháng; mỗi ô ngày có màu trạng thái, giá 1 vé và số cabin còn trống. Trên điện thoại tự chuyển sang dạng danh sách. |
| Tạo lịch cho cả tháng hoặc quý | Nút **Tạo lịch chạy**, 4 bước: tàu & giờ → ngày chạy (chọn khoảng ngày và các thứ trong tuần) → giá & số cabin → xem trước số chuyến tạo mới / cập nhật / bỏ qua → xác nhận. Giờ chạy tự điền theo lịch đã biết của tàu. |
| Đặt giá riêng cho cuối tuần, ngày lễ | **Chọn nhiều ngày**, rồi chọn nhanh “Cuối tuần”, “T7 & CN”, “Ngày thường” hoặc bấm từng ngày → **Đổi giá**. Có bảng xem trước giá cũ → giá mới. |
| Sửa một ngày | Bấm vào ngày để mở bảng bên phải. Bảng có: Mở bán / Tạm ngưng / Hủy chuyến, ô giá có nút ±50k, ±100k, số cabin dạng nút − / +, và số cabin đã bán / đang giữ / còn trống. |
| Không phải tự tính giá cabin | Admin chỉ nhập **giá 1 vé**. Hệ thống luôn hiển thị “Khách trả cho 1 cabin (4 vé)” = giá × 4. |
| Tránh thao tác gây hại | Không giảm được số cabin xuống dưới số đã bán/giữ chỗ. Không hủy được chuyến đã có khách. Không sửa được chuyến đã chạy. Chỉ xóa được chuyến tạo nhầm khi chưa có đơn. Nếu hai người sửa cùng lúc, người sau được báo và trang tự tải lại. |
| Phân quyền | **Hỗ trợ:** chỉ xem. **Giá vé:** chỉ đổi giá. **Vận hành / Quản trị:** toàn quyền. Quyền được kiểm tra ở cả database, không chỉ ẩn nút. |

Ngoài ra:
- Lỗi được hiển thị bằng tiếng Việt dễ hiểu.
- Có hướng dẫn 3 bước, ẩn được.
- Tuyến, tháng và tàu đang xem được lưu trên URL, nên gửi link cho đồng nghiệp sẽ mở đúng màn hình.
- Mọi thay đổi vẫn được ghi vào `audit_logs`.

**File chính:**
- `src/components/admin/schedule/*`
- `src/app/admin/(authenticated)/calendar/page.tsx`
- `src/app/api/admin/schedule-calendar/route.ts`
- `supabase/migrations/202611140001_schedule_calendar_admin.sql`

### 2.2 Lỗi đã sửa

| # | Mức | Lỗi | Hậu quả | Sửa ở |
|---|---|---|---|---|
| 1 | Nghiêm trọng | `create_booking_hold` báo lỗi “record inbound is not assigned yet” với **mọi đơn một chiều**. 3 đơn cũ trong database đều là khứ hồi nên lỗi chưa từng lộ ra. | Khách mua vé một chiều không thanh toán được. | `202611140002_fix_one_way_booking_hold.sql` (đã chạy thử: giữ chỗ → thanh toán mô phỏng → `confirmed/paid`) |
| 2 | Nghiêm trọng | Đồng bộ DSVN lúc 04:00 tự **mở bán lại** những ngày admin đã tạm ngưng hoặc hủy. | Admin không kiểm soát được việc bán vé. | Cột `admin_status_override`; đồng bộ giữ nguyên quyết định của nhân viên |
| 3 | Cao | Chuyến mới do DSVN tạo lấy giá của chuyến **xa nhất trong tương lai**, có thể là giá Tết. | Bán sai giá cho ngày thường. | Lấy giá của cùng tàu, ngày gần nhất trước đó |
| 4 | Cao | DSVN tạo **chuyến trùng** khi admin đã tạo trước chuyến cùng tàu, cùng ngày nhưng lệch vài phút. | Một tàu xuất hiện hai lần, giá có thể khác nhau. | Đồng bộ nhận lại chuyến admin đã tạo và giữ giá admin đặt |
| 5 | Nghiêm trọng | Khóa idempotency không đổi trong cả phiên. Khách quay lại đổi tàu, cabin hoặc hành khách thì vẫn nhận **đơn cũ**. Khi hết 15 phút giữ chỗ, mọi lần thử lại đều trả về đơn đã hết hạn. | Khách trả tiền cho lựa chọn cũ. | `BookingPageContent.tsx`: tạo khóa mới khi lựa chọn đổi hoặc giữ chỗ hết hạn. Có thông báo rõ khi cabin vừa bị người khác đặt (409). |
| 6 | Cao | Nút “Đặt vé” trên trang Cabin và link “bài liên quan” ở Blog trỏ tới URL thiếu `/vi` hoặc `/en`. | Khách bấm vào ra trang 404. | `cabins/page.tsx`, `blog/[slug]/page.tsx` |
| 7 | Cao | Font chữ thân (DM Sans) **không có bộ ký tự tiếng Việt**. | Các chữ ạ, ế, ộ, ữ… hiện bằng font khác ngay giữa từ, trên toàn site. | `app/layout.tsx`: đổi sang Be Vietnam Pro; bật bộ ký tự tiếng Việt cho Playfair và Cormorant |
| 8 | Trung bình | “Giá từ …” trên trang chủ và trang Cabin đọc từ file JSON tĩnh. | Lệch với giá admin đặt. | `src/lib/public-fares.ts`: đọc giá đang mở bán thật (cập nhật tối đa sau 5 phút). Tuyến chưa mở bán ghi “Chưa mở bán” thay vì quảng cáo giá không mua được. |

### 2.4 Thanh toán VNPay + PayPal (bổ sung)

- **VNPay:** chỉ hiện khi đã cấu hình. Thêm lựa chọn **Thẻ quốc tế Visa/Mastercard/JCB** (`VNPAY_INTERNATIONAL_CARDS=true`, mã `INTCARD`).
- **PayPal:**
  - Thu bằng USD theo tỷ giá cấu hình.
  - Server tự trừ tiền qua API PayPal và đối chiếu số tiền rồi mới xác nhận đơn.
  - Có webhook dự phòng, kiểm tra chữ ký.
  - Khách hủy vẫn giữ cabin và được chọn lại phương thức.
- **Đổi phương thức:** khách được đổi giữa các cổng. Nếu trả hai lần, khoản thứ hai bị đánh dấu `review` để hoàn tiền (migration `202611140003`).
- **Bước thanh toán:** có đồng hồ đếm ngược giữ cabin, chỉ hiện phương thức đã bật.
- **Trang trạng thái:** tách riêng các trạng thái thành công / đang chờ / hủy / hết hạn / đối soát. Tự kiểm tra lại trong 60 giây. Có nút thanh toán lại.
- **Ngôn ngữ đơn:** lấy theo trang khách đặt, không theo trình duyệt.

### 2.5 Đồng bộ giờ tàu DSVN (bổ sung 15/11)

- **Lỗi:** trang giotaugiave.dsvn.vn đổi cấu trúc. Tiêu đề cột đổi từ "Tên Ga" thành "Ga", giờ ngày sau đổi từ "ngày +1" thành "00:03+1". Từ đó mọi lần đồng bộ đều lỗi "DSVN timetable tables were not found".
- **Đã sửa:** chấp nhận cả hai kiểu, nhận diện cột tàu theo tên. Đã chạy thử qua route cron: 14/14 snapshot, 70 chuyến, khớp bảng DSVN.
- **Deploy Vercel:** thêm `outputFileTracingIncludes` để Vercel đóng gói kèm Chromium.
- **Cảnh báo:** trang Lịch & Giá báo khi lần đồng bộ gần nhất lỗi hoặc đã hơn 36 giờ chưa chạy.
- **Giới hạn:** nguồn là bảng giờ cố định, không phải dữ liệu theo ngày của dsvn.vn. Tàu tăng cường hay hủy đột xuất theo ngày cần nhân viên chỉnh tay, hoặc xin DSVN cấp dữ liệu chính thức.

### 2.3 Việc cần làm để đưa lên production

1. Chạy `npx supabase db push` để áp dụng 3 migration mới: `202611140001`, `202611140002`, `202611140003`. **Bắt buộc**, vì có lỗi #1 và thanh toán PayPal.
2. Deploy code.
3. Hướng dẫn admin: đăng nhập → **Lịch chạy & giá vé** → bấm **Hướng dẫn**.

---

## 3. Đề xuất tiếp theo (theo ưu tiên)

### P0 — Nên làm trước khi bán vé thật

| # | Vấn đề | Đề xuất |
|---|---|---|
| P0-1 | **Giá hiển thị chưa gồm 10% VAT.** Kết quả tìm chuyến ghi “Giá cuối cùng” (`ScheduleResults.tsx:74`) nhưng thanh toán cộng thêm 10% (`create_booking_hold`). Ví dụ: thấy 8.000.000đ, phải trả 8.800.000đ. | Chọn một trong hai (cần chủ doanh nghiệp quyết): (a) giá admin nhập đã gồm VAT, bỏ cộng thêm; (b) mọi nơi hiển thị giá ghi rõ “+10% VAT” và tổng sau thuế. |
| P0-2 | **Không gửi email xác nhận sau khi thanh toán.** Không có chỗ nào gọi `triggerBookingEmail` khi IPN báo thành công, nhưng màn hình vẫn ghi “Email xác nhận đã được gửi” (`ConfirmationStep.tsx:153`). | Gửi email ở bước `apply_verified_payment_event` = confirmed, kèm link tra cứu đơn; sửa câu chữ cho đúng. |
| P0-3 | **Trang trạng thái đơn hỏng khi khách quay lại từ app ngân hàng.** Mã xác thực đơn chỉ nằm trong `sessionStorage`, nên mở bằng tab, trình duyệt hay thiết bị khác thì báo “Không xác minh được đơn”. Đơn thất bại, hết hạn hay cần đối soát đều hiện chung một câu “đang chờ”. | Dùng cookie HttpOnly hoặc token ký trong return URL; hiển thị riêng từng trạng thái; có nút “Thanh toán lại” khi còn giữ chỗ; tự kiểm tra lại mỗi 3 giây trong 60 giây; hiện hotline và Zalo. |
| P0-4 | **Thiếu trang chính sách.** Footer trỏ tới `/#refund-policy`, `/#terms`, `/#privacy-policy`, nhưng các mục này không tồn tại. VNPay yêu cầu có các trang này để duyệt merchant. | Viết 3 trang (hoàn/hủy vé, điều khoản, quyền riêng tư); thêm ô đồng ý ở bước thanh toán. |
| P0-5 | **Form liên hệ không lưu và không gửi đi đâu**, chỉ `console.log` (`api/contact/route.ts`), trong khi giao diện hứa phản hồi trong 24 giờ. | Lưu vào Supabase và gửi email cho nhân viên. |

### P1 — Tăng tỷ lệ đặt vé & trải nghiệm thanh toán

| # | Vấn đề | Đề xuất |
|---|---|---|
| P1-1 | Không có đồng hồ đếm ngược giữ chỗ. Bước thanh toán chỉ ghi “giữ 15 phút” và không hiện tàu, ngày, cabin đang trả tiền. | Hiển thị đếm ngược theo `expiresAt`, tóm tắt hành trình, và nút “Tìm lại” khi hết giờ. |
| P1-2 | **Lịch giá trong ô chọn ngày.** Đã có sẵn hàm `search_fare_calendar` (migration mới). | Hiện giá thấp nhất mỗi ngày ngay trong bộ chọn ngày, gợi ý “ngày gần đó còn cabin” khi hết chỗ. |
| P1-3 | Khứ hồi với VIP2 không bao giờ hoàn tất được: chiều về bắt buộc cùng loại cabin, mà VIP2 chỉ có trên SE19 (tàu chạy chiều Nam). | Cho chọn loại cabin khác ở chiều về, hoặc ẩn VIP2 khi chọn khứ hồi và giải thích lý do. |
| P1-4 | Trên điện thoại, kết quả tìm chuyến nằm dưới khoảng 900px nội dung giới thiệu: bấm tìm xong không thấy gì thay đổi. | Đưa kết quả ngay dưới form và tự cuộn tới. |
| P1-5 | Tải lại trang hoặc bấm nút back là mất toàn bộ bước đặt vé. | Lưu bước và lựa chọn vào URL hoặc `sessionStorage`. |
| P1-6 | Form hành khách bắt buộc email và số điện thoại cho từng người, kể cả trẻ em. Nhãn chưa gắn với ô nhập (`htmlFor`). | Chỉ người đại diện cần nhập email/SĐT; gắn nhãn cho ô nhập; báo lỗi ngay tại từng ô. |
| P1-7 | Yêu cầu đặc biệt và giới tính được hỏi nhưng không lưu. | Lưu lại, hoặc bỏ hai ô này. |
| P1-8 | Lỗi từ server hiện bằng tiếng Anh trên trang tiếng Việt (ví dụ “Order not found.”). | Map mã lỗi sang câu tiếng Việt và tiếng Anh. |
| P1-9 | Ngôn ngữ của đơn lấy theo `Accept-Language` của trình duyệt, không theo trang khách đang xem. | Gửi `locale` trong body. |
| P1-10 | MoMo chưa tích hợp. (Đã thêm PayPal và lựa chọn thẻ quốc tế của VNPay — xem mục 2.4.) | Làm sau khi VNPay ổn định, dùng chung interface provider. |

### P2 — Hình ảnh, nội dung, SEO

| # | Vấn đề | Đề xuất |
|---|---|---|
| P2-1 | Trang Cabin mỗi loại chỉ có 1 ảnh; ảnh dọc bị đặt vào khung ngang. Cùng một ảnh `4pax.JPG` lúc là VIP2, lúc là Full Cabin. Các ảnh `violette-cabin-vip-1/2/3`, `violette-dining`, `violette-kitchen`… chưa dùng đến. | Mỗi loại cabin có gallery riêng (bấm để phóng to); xác nhận ảnh nào đúng cho loại nào. |
| P2-2 | Gallery trang chủ chỉ có 3 ảnh và không bấm phóng to được. | Mở rộng, thêm lightbox. |
| P2-3 | Canonical của mọi trang trỏ về trang chủ; `<html lang="vi">` cố định cả ở trang tiếng Anh. | Đặt canonical và hreflang riêng cho từng trang; `lang` theo ngôn ngữ. |
| P2-4 | `sitemap.ts`: 6/13 URL thiếu tiền tố ngôn ngữ (ra 404); thiếu bài blog. | Sinh sitemap theo từng ngôn ngữ, có alternates. |
| P2-5 | Trang 404 hiện nguyên chữ `notFound.title`. | Sửa cách đọc bản dịch. |
| P2-6 | Blog và metadata quảng bá Hà Nội – Sapa, nhưng tuyến này không đặt được. | Đồng bộ nội dung với các tuyến đang bán. |
| P2-7 | Mọi section trang chủ là client component chỉ để làm hiệu ứng hiện dần. Tiêu đề hero bị `opacity:0` cho tới khi JS chạy xong. Logo SVG nặng 192KB. | Chuyển thành server component và dùng hiệu ứng CSS; tối ưu logo. |
| P2-8 | Nút đổi ngôn ngữ làm mất query (mất mã đơn trên trang trạng thái). | Giữ nguyên `searchParams` khi đổi ngôn ngữ. |
| P2-9 | Chữ phụ màu xám nhạt trên nền trắng có độ tương phản khoảng 2,5:1. | Đổi sang `gray-500` trở lên. |

### P3 — Admin & vận hành

| # | Vấn đề | Đề xuất |
|---|---|---|
| P3-1 | **`/api/admin/[...slug]` chuyển tiếp mọi request tới Flask (`VM_API_URL`) mà không kiểm tra đăng nhập.** | Thêm `requireAdminApi`, hoặc gỡ bỏ nếu không còn dùng Violet Manager. |
| P3-2 | Các trang admin cũ (`/admin/pricing`, `/schedules`, `/routes`, `/bookings`, `/ledger`, `/stats`, `/users`, `/settings`, `/sheets`, `/debts`) vẫn truy cập được. Chúng dùng token cũ và file JSON. Riêng `/admin/pricing` ghi vào `data/product-pricing.json`, không tác động tới giá bán thật. | Gỡ hoặc chuyển hướng về trang mới để admin không sửa nhầm chỗ. |
| P3-3 | Đồng bộ DSVN tự **hủy** chuyến không còn trong lịch DSVN, kể cả chuyến đã có khách trả tiền. | Đưa các chuyến này vào hàng chờ “cần xử lý”, báo cho admin thay vì hủy im lặng. |
| P3-4 | Chưa có màn hình xem lịch sử thay đổi (bảng `audit_logs` đã có dữ liệu). | Thêm tab “Lịch sử” trong bảng ngày: ai đổi giá gì, lúc nào. |
| P3-5 | Thêm ga, tàu, tuyến (`/admin/operations`) vẫn yêu cầu mã kỹ thuật (HNO, SE19…). | Viết hướng dẫn trong form, hoặc chọn từ danh sách ga DSVN có sẵn. |
| P3-6 | Chưa có “giá mặc định theo tuyến”. Chuyến do DSVN tự thêm đang kế thừa giá ngày gần nhất. | Nếu cần, thêm bảng giá mặc định cho từng tuyến/tàu và cho admin chỉnh trên trang Lịch. |

---

## 4. Cần chủ doanh nghiệp quyết định

1. Giá admin nhập **đã gồm VAT** hay chưa (P0-1).
2. Chính sách hoàn/hủy vé và đổi ngày (P0-4).
3. VIP2 có bán cho khứ hồi không (P1-3).
4. Ai nhận email và cuộc gọi khi khách liên hệ, giờ trực, và kênh Zalo chính thức (P0-3, P0-5).
5. Cổng thanh toán production: VNPay trước, MoMo sau?

---

## 5. Kiểm thử đã chạy

- Database (Supabase local, trong transaction rollback):
  - tạo hàng loạt có xem trước;
  - sửa hàng loạt;
  - xung đột phiên bản (VT409);
  - chặn giảm cabin, hủy chuyến hoặc xóa chuyến khi đã có khách;
  - chặn mở bán khi 0 cabin;
  - VIP2 trên tàu không phải SE19 bị bỏ qua;
  - chặn sửa chuyến đã chạy;
  - phân quyền Giá vé / Hỗ trợ / anon;
  - đồng bộ DSVN giữ trạng thái admin;
  - kế thừa giá gần nhất;
  - `search_fare_calendar` / `public_fare_overview` cho anon.
- Trình duyệt (Playwright, 1440px và 390px):
  - trình tạo lịch 4 bước;
  - sửa giá một ngày;
  - chọn cuối tuần rồi đổi giá hàng loạt;
  - giao diện điện thoại.
- Đầu-cuối: đơn một chiều → giữ chỗ → thanh toán mô phỏng → `confirmed/paid`.
- `npm run type-check` và ESLint cho các file đã sửa: sạch.
