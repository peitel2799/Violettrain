# Violette Train

Website bán vé tàu Violette Train, xây dựng bằng Next.js. Dự án gồm giao diện khách hàng song ngữ Việt/Anh và trang quản trị dùng Supabase để quản lý ga, tàu, tuyến, chuyến chạy theo ngày, số cabin và giá vé.

## Yêu cầu môi trường

- Node.js 20 LTS hoặc 22 LTS
- npm 10 trở lên
- Một dự án Supabase Cloud; hoặc Docker Desktop nếu muốn chạy Supabase hoàn toàn trên máy
- Git

Kiểm tra phiên bản đang dùng:

```bash
node --version
npm --version
```

## Chạy nhanh với Supabase Cloud

### 1. Cài thư viện

Tại thư mục gốc của dự án:

```bash
npm ci
```

### 2. Tạo file biến môi trường

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Mở `.env.local` và điền tối thiểu hai giá trị sau:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BOOKING_DATA_SOURCE=supabase
```

Lấy URL, anon key và service-role key tại **Supabase Dashboard → Project Settings → API**. `SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng trong API phía server để tạo phiên thanh toán và xác nhận IPN. Không đưa key này vào biến bắt đầu bằng `NEXT_PUBLIC_`, không dùng trong component trình duyệt và không commit `.env.local` lên Git.

### 3. Áp dụng database migration

Đăng nhập Supabase CLI, liên kết dự án rồi đẩy migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migration trong `supabase/migrations` sẽ tạo catalog vận hành, chuyến chạy theo ngày, tồn cabin, giá, đơn hàng, hold 15 phút, hành khách, thanh toán, audit log, RLS và các hàm giao dịch chống bán vượt chỗ.

### 4. Tạo tài khoản admin đầu tiên

1. Mở **Supabase Dashboard → Authentication → Users**.
2. Chọn **Add user**, nhập email và mật khẩu admin.
3. Sao chép UUID của user vừa tạo.
4. Mở **SQL Editor** và chạy lệnh sau sau khi thay `AUTH_USER_UUID`:

```sql
insert into public.admin_profiles (user_id, display_name, role, active)
values ('AUTH_USER_UUID', 'Violette Admin', 'admin', true)
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    active = excluded.active;
```

Các role hiện có:

| Role | Quyền sử dụng |
| --- | --- |
| `admin` | Toàn quyền quản trị |
| `operations` | Quản lý ga, tàu, tuyến, lịch chạy và tồn cabin |
| `pricing` | Theo dõi nghiệp vụ giá; quyền sửa giá riêng sẽ được hoàn thiện ở giai đoạn sau |
| `support` | Xem dữ liệu để hỗ trợ khách hàng |

### 5. Khởi động website

```bash
npm run dev
```

Các địa chỉ chính:

- Website tiếng Việt: <http://localhost:3000/vi>
- Website tiếng Anh: <http://localhost:3000/en>
- Tìm và đặt vé: <http://localhost:3000/vi/booking>
- Đăng nhập admin: <http://localhost:3000/admin/login>
- Lịch chạy & giá vé theo ngày (trang admin chính): <http://localhost:3000/admin/calendar>
- Thiết lập nâng cao (ga, tàu, tuyến, đồng bộ DSVN): <http://localhost:3000/admin/operations>
- Đơn và thanh toán: <http://localhost:3000/admin/orders>

## Chạy Supabase hoàn toàn trên máy

Cách này cần Docker Desktop đang hoạt động.

Khởi tạo cấu hình Supabase nếu repo chưa có `supabase/config.toml`:

```bash
npx supabase init
```

Khởi động Supabase local và áp dụng lại toàn bộ migration:

```bash
npx supabase start --exclude mailpit,studio,vector,logflare
npx supabase db reset
npx supabase status
```

Trên Windows, nếu các cổng mặc định `54321`–`54327` bị hệ thống giữ, repo này dùng các cổng local `55421` (API), `55423` (Studio), `55427` (analytics) và `55432` (database). `supabase/config.toml` đã được tạo sẵn. Máy không cần Mailpit/Studio để đăng nhập; các service đó đã được loại khỏi lệnh khởi động ở trên.

Lệnh `supabase status` hiển thị local API URL, anon key và địa chỉ Supabase Studio. Điền giá trị local vào `.env.local`, thường có dạng:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421
NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_FROM_SUPABASE_STATUS
SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_FROM_SUPABASE_STATUS
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BOOKING_DATA_SOURCE=supabase
```

Nếu bật Studio, mở URL được in ra và tạo user trong **Authentication → Users**, rồi thêm profile admin bằng câu SQL ở phần trên. Lệnh local tối giản trong README tắt Studio; khi đó có thể bật thêm Studio bằng cách bỏ `studio` khỏi `--exclude` (cổng Studio của repo là `55423`) hoặc tạo user bằng Auth API/SQL.

Sau khi tạo user và profile admin, chạy:

```bash
npm run dev
```

Dừng các dịch vụ Supabase local khi không sử dụng:

```bash
npx supabase stop
```

## Biến môi trường tùy chọn

Toàn bộ mẫu cấu hình nằm trong `.env.example`.

### Thanh toán thủ công qua PayPal (mặc định)

Khi `PAYMENT_MODE=manual_paypal` (mặc định), website **không thu tiền trực tiếp**. Luồng như sau:

1. Khách chọn chuyến, nhập thông tin hành khách và **số WhatsApp** (bắt buộc, kèm mã quốc gia; số Việt Nam bắt đầu bằng 0 sẽ được hiểu là +84).
2. Hệ thống giữ cabin trong `MANUAL_PAYMENT_HOLD_HOURS` giờ (mặc định 24, tối đa 48).
3. Khách nhận **email tự động từ email công ty**. Email có mã đặt chỗ, hành trình, tổng tiền, số USD cần chuyển, tài khoản PayPal, link PayPal.me và hạn chuyển khoản. Nhân viên nhận một bản ẩn (BCC) ở `BOOKING_NOTIFY_EMAIL`.
4. Màn hình xác nhận trên web hiện đúng các thông tin đó, kèm nút nhắn WhatsApp cho công ty.
5. Khi tiền về tài khoản PayPal, nhân viên vào `/admin/orders`, bấm **Đã nhận tiền** ở đơn tương ứng. Đơn chuyển sang “Đã xác nhận” và khách nhận email xác nhận. Đơn không thanh toán có thể **Hủy đơn** để mở bán lại cabin; email có thể **Gửi lại**.

Cấu hình tối thiểu:

```dotenv
PAYMENT_MODE=manual_paypal
PAYPAL_RECEIVER_EMAIL=paypal-cua-cong-ty@example.com
PAYPAL_ME_URL=https://paypal.me/ten-cua-ban    # không bắt buộc
PAYPAL_VND_PER_USD=26000                        # để email ghi số USD cần chuyển
COMPANY_WHATSAPP=+84915823667
BOOKING_NOTIFY_EMAIL=dat-ve@example.com

SMTP_HOST=smtp.gmail.com                        # xem GMAIL_SMTP_SETUP.txt
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email-cong-ty@gmail.com
SMTP_PASS=MAT_KHAU_UNG_DUNG_16_KY_TU
EMAIL_FROM=email-cong-ty@gmail.com              # với Gmail phải trùng SMTP_USER
EMAIL_REPLY_TO=email-cong-ty@gmail.com
```

Khi chưa đặt `SMTP_HOST`, email không được gửi thật mà chỉ ghi ra terminal. Đặt thêm `EMAIL_PREVIEW_DIR=.tmp/emails` để lưu mỗi email thành file `.html` và mở xem trên trình duyệt. Hai migration `202611140002` và `202611151030` cần được áp dụng (`npx supabase db push`).

Khi muốn chuyển sang thanh toán trực tiếp trên web, đặt `PAYMENT_MODE=online` và cấu hình VNPay/PayPal như các mục dưới.

### Thanh toán trực tuyến (`PAYMENT_MODE=online`)

Ở local, bật cổng mô phỏng để kiểm tra trọn luồng mà không phát sinh giao dịch thật:

```dotenv
PAYMENT_FAKE_ENABLED=true
```

Trong production, cổng mô phỏng luôn bị vô hiệu dù biến trên có giá trị gì. Để dùng VNPay sandbox/production, điền thông tin merchant do VNPay cấp:

```dotenv
VNPAY_TMN_CODE=YOUR_TMN_CODE
VNPAY_HASH_SECRET=YOUR_HASH_SECRET
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

Khai báo hai URL sau trong cấu hình merchant, thay `YOUR_DOMAIN` bằng domain HTTPS thật:

```text
Return URL: https://YOUR_DOMAIN/api/payments/vnpay/return
IPN URL:    https://YOUR_DOMAIN/api/payments/vnpay/ipn
```

IPN đã kiểm tra chữ ký HMAC-SHA512, mã giao dịch, số tiền và chống xử lý lặp trước khi chuyển đơn sang `confirmed`. Return URL chỉ hiển thị kết quả; nó không tự xác nhận thanh toán. Không thể bật thanh toán thật nếu chưa có tài khoản merchant và credential hợp lệ từ VNPay.

Khi VNPay đã mở thẻ quốc tế (Visa/Mastercard/JCB) trong hợp đồng, đặt `VNPAY_INTERNATIONAL_CARDS=true` để hiện thêm lựa chọn “Thẻ quốc tế”; khách được đưa thẳng tới form nhập thẻ (`vnp_BankCode=INTCARD`), tiền vẫn thu bằng VND.

#### PayPal (khách nước ngoài)

PayPal không thu VND với tài khoản merchant thông thường, nên web thu bằng **USD** theo tỷ giá bạn cấu hình (`PAYPAL_VND_PER_USD`, làm tròn lên tới cent). Mỗi lần thanh toán lưu lại số USD và tỷ giá đã dùng.

1. Đăng nhập <https://developer.paypal.com> → **Apps & Credentials** → tab **Sandbox** → **Create App** → sao chép *Client ID* và *Secret*.
2. Trong app đó, mục **Webhooks** → **Add Webhook** với URL `https://YOUR_DOMAIN/api/payments/paypal/webhook`, chọn các sự kiện `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED` → sao chép *Webhook ID*.
3. Điền vào môi trường:

```dotenv
PAYPAL_ENV=sandbox            # đổi thành live khi chạy thật (dùng Client ID/Secret tab Live)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_VND_PER_USD=26000      # cập nhật khi tỷ giá thay đổi
PAYPAL_WEBHOOK_ID=...
```

Luồng: server tạo PayPal order → khách duyệt trên PayPal → quay về `/api/payments/paypal/return`, server **capture qua API PayPal** rồi đối chiếu số USD trước khi xác nhận đơn. Webhook là đường dự phòng khi khách đóng trình duyệt. Webhook không qua được bước xác minh chữ ký với PayPal sẽ bị từ chối. Khách hủy trên PayPal vẫn giữ cabin và được chọn lại phương thức ở trang trạng thái đơn.

Khách có thể đổi giữa VNPay và PayPal trong lúc giữ cabin. Nếu cả hai cùng thanh toán thành công, đơn chỉ xác nhận một lần và khoản thứ hai chuyển sang trạng thái `review` để nhân viên hoàn tiền. Hoàn tiền PayPal hiện làm thủ công trên trang quản lý PayPal.

Luồng kiểm tra local:

1. Admin tạo ga, tàu, tuyến ở `/admin/operations`, rồi tạo lịch chạy và đặt giá ở `/admin/calendar` (nút **Tạo lịch chạy**, chọn “Mở bán ngay”).
2. Khách tìm chuyến ở `/vi/booking`, chọn nguyên cabin và nhập thông tin hành khách.
3. Hệ thống giữ một cabin trong 15 phút và chuyển sang bước thanh toán.
4. Chọn **Thanh toán mô phỏng (local)**. Đơn hợp lệ sẽ thành `confirmed/paid` và xuất hiện tại `/admin/orders`.

### Email

Ở local có thể để trống `SMTP_HOST`; email đặt vé sẽ được ghi ra terminal thay vì gửi thật.

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@violettetrain.vn
EMAIL_FROM_NAME=Violette Train
EMAIL_REPLY_TO=info@violettetrain.vn
```

### Violet Manager cũ

Một số màn hình admin cũ vẫn gọi Flask API. Chỉ cần cấu hình các biến dưới đây khi chạy backend cũ đó; trang `/admin/operations` mới không phụ thuộc Flask.

```dotenv
VM_API_URL=http://localhost:5001/api
NEXT_PUBLIC_VM_URL=http://localhost:5173
```

`ADMIN_SECRET_TOKEN` chỉ phục vụ một số API admin cũ. Không có mật khẩu mặc định; nếu không dùng các API cũ thì giữ biến này rỗng.

## Đồng bộ lịch tàu & giá vé DSVN

Nguồn: trang công khai `giotaugiave.dsvn.vn`. Trình duyệt chạy ngầm (Chromium) dùng form "Giờ tàu" và "Giá vé" giống một người tra cứu, mỗi lần một lượt, có nghỉ ngắn giữa các lượt. Không gọi API đặt vé, không cần API key, không có và không vượt CAPTCHA. Ba tuyến được đọc: Tàu khách Bắc Nam; Hà Nội – Vinh – Huế – Đà Nẵng (SE19/20, SE17/18, HĐ…); Hà Nội – Lào Cai (SP…).

- **Lịch chạy theo từng ngày:** những tàu DSVN thực sự chạy ngày đó (kể cả tàu tăng cường dịp Tết), giờ đi và giờ đến tại từng ga.
- **Giá vé DSVN (giá cơ sở):** mọi loại chỗ của từng tàu và chặng, lưu ở bảng `dsvn_fares`. Lịch giá admin hiện giá khoang 4 tầng 1/tầng 2 và mức lãi/lỗ so với giá bán của Violette.
- **Ngày DSVN chưa mở bán:** điền lịch dự kiến (các tàu chạy đều đặn 7 ngày cuối có dữ liệu), luôn ở trạng thái nháp, gắn nhãn "Lịch dự kiến". Khi DSVN mở bán, lần đồng bộ sau thay bằng dữ liệu thật.

**Hằng ngày (Vercel cron 04:00):** `vercel.json` gọi `GET /api/cron/dsvn-sync` lúc `21:00 UTC`. Mỗi lượt cập nhật lịch cho `DSVN_SYNC_DAYS` ngày tới, rồi dùng thời gian còn lại (khoảng 4 phút) để cập nhật giá DSVN cho những ngày lâu chưa cập nhật nhất. Ngày gần được ưu tiên: dưới 7 ngày cập nhật mỗi ngày, dưới 30 ngày ba ngày một lần, xa hơn mỗi tuần. Biến môi trường trên Vercel:

```dotenv
DSVN_CHROME_EXECUTABLE_PATH=
DSVN_SYNC_DAYS=30
CRON_SECRET=MOT_CHUOI_NGAU_NHIEN_DAI
```

**Chạy dài hạn (không giới hạn thời gian):** khoảng 3 tháng dữ liệu mất 1–2 giờ.

```bash
npm run dsvn:sync -- --until 2027-06-30           # database trong .env.local
npm run dsvn:sync -- --until 2027-06-30 --cloud   # project Supabase cloud đã link (cần `npx supabase login`)
```

Tùy chọn khác: `--from YYYY-MM-DD`, `--skip-fares` (chỉ lịch), `--reproject` (tạo lại lịch dự kiến). Nên chạy lệnh `--cloud` khoảng mỗi tuần một lần, để giá của các ngày xa (trên 30 ngày) luôn mới.

Đồng bộ chỉ thay đổi tàu, giờ chạy và giá tham khảo của DSVN. Giá bán Violette, sức chứa cabin, quy tắc mua trọn 4 vé và VIP2 chỉ có trên SE19 vẫn do hệ thống Violette quản lý. Chuyến mới chỉ kế thừa giá và sức chứa của **cùng tàu** ở ngày gần nhất. Nếu tàu chưa từng được đặt giá (ví dụ tàu địa phương, tàu tăng cường) thì chuyến ở trạng thái nháp để admin quyết định. Ngày nào nhân viên đã tự mở bán hoặc tạm ngưng thì đồng bộ giữ nguyên quyết định đó. Trạng thái từng ngày nằm ở bảng `dsvn_sync_dates`, nhật ký mỗi lượt ở `schedule_sync_runs`.

## Kiểm tra trước khi commit

```bash
npm run type-check
npm run build
```

Chạy bản production đã build:

```bash
npm run start
```

Mặc định ứng dụng chạy ở cổng `3000`. Có thể đổi cổng bằng:

```bash
npm run dev -- --port 3001
```

## Quy tắc giá cabin hiện tại

- Giá hiển thị cho một vé vẫn là giá đơn: `1.800.000`, `1.900.000`, `2.100.000` VND...
- Một cabin có 4 vé, vì vậy tổng giá cabin luôn bằng `giá một vé × 4`.
- Khách mua cabin phải mua trọn cả 4 vé.
- Chỉ tàu `SE19` được phép có tối đa một cabin `VIP2`; các tàu khác chỉ bán nguyên cabin tiêu chuẩn.
- Các ràng buộc quan trọng được kiểm tra ở database/API, không chỉ ở giao diện.

## Xử lý lỗi thường gặp

### Trang admin báo Supabase chưa được cấu hình

Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong `.env.local`, sau đó dừng và chạy lại `npm run dev`.

### Đăng nhập đúng nhưng bị từ chối truy cập

User đã tồn tại trong Supabase Auth nhưng chưa có bản ghi hoạt động trong `public.admin_profiles`. Chạy lại câu SQL tạo profile admin và kiểm tra `active = true`.

### Migration chưa được áp dụng

Với Supabase Cloud:

```bash
npx supabase db push
```

Với Supabase local:

```bash
npx supabase db reset
```

### Docker/Supabase local không khởi động

Mở Docker Desktop, chờ Docker Engine sẵn sàng rồi chạy lại `npx supabase start`. Có thể xem trạng thái bằng `npx supabase status`.

### Cổng 3000 đang được sử dụng

Chạy ứng dụng ở cổng khác:

```bash
npm run dev -- --port 3001
```

## Cấu trúc chính

```text
src/app/[locale]/                 Website khách hàng Việt/Anh
src/app/admin/                    Trang đăng nhập và quản trị
src/app/api/                      Next.js API routes
src/components/admin/operations/ Giao diện quản lý vận hành
src/lib/supabase/                 Supabase client/server helpers
src/lib/payments/                 Ký và kiểm tra dữ liệu cổng thanh toán
supabase/migrations/              Database schema và migration
data/                             Dữ liệu JSON của các tính năng cũ
```

Chi tiết riêng về database admin có tại [supabase/README.md](supabase/README.md).
