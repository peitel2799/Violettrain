import { COMPANY } from '@/lib/company'

export type PolicyKey = 'refund' | 'terms' | 'privacy'
export type PolicySection = { heading: string; paragraphs?: string[]; items?: string[] }
export type PolicyDoc = { title: string; description: string; intro: string; sections: PolicySection[] }

/** Shown as "last updated" on every policy page. Change it whenever the text changes. */
export const POLICY_UPDATED = '2026-11-18'

/** Path of each policy page, without the locale prefix. */
export const POLICY_PATHS: Record<PolicyKey, string> = {
  refund: '/refund-policy',
  terms: '/terms',
  privacy: '/privacy',
}

const C = COMPANY
const contactVi = `hotline ${C.phone} hoặc ${C.phoneAlt}, email ${C.email}`
const contactEn = `hotline ${C.phone} or ${C.phoneAlt}, email ${C.email}`

// Ticket exchange/return fees follow the published rules of Vietnam Railways
// (DSVN) for individual tickets: >=24h before departure 10%, 4h to <24h 20%,
// under 4h not accepted; exchange >=24h before departure, 20,000 VND per ticket.
export const POLICIES: Record<PolicyKey, { vi: PolicyDoc; en: PolicyDoc }> = {
  refund: {
    vi: {
      title: 'Chính sách hoàn, đổi vé',
      description: 'Quy định trả vé, đổi vé và hoàn tiền khi đặt vé tàu qua Violette Train.',
      intro:
        `Vé tàu đặt qua trang này là vé của Tổng công ty Đường sắt Việt Nam (ĐSVN) do ${C.legalName.vi} đặt và xuất cho quý khách. ` +
        'Vì vậy việc đổi, trả vé tuân theo quy định của ĐSVN tại thời điểm xuất vé. Mức phí dưới đây là mức ĐSVN đang áp dụng cho vé cá nhân; ' +
        'nếu ĐSVN thay đổi, Violette áp dụng mức mới và báo cho quý khách trước khi xử lý.',
      sections: [
        {
          heading: 'Trước khi thanh toán',
          paragraphs: [
            'Đơn chưa thanh toán chỉ là giữ chỗ tạm. Nếu quý khách không thanh toán trong thời hạn giữ chỗ ghi trên màn hình đặt vé hoặc trong email hướng dẫn, đơn tự hủy và không mất phí. Quý khách cũng có thể báo hủy qua hotline hoặc email bất cứ lúc nào trước khi thanh toán.',
          ],
        },
        {
          heading: 'Trả vé sau khi đã thanh toán',
          items: [
            'Từ 24 giờ trở lên trước giờ tàu chạy: phí trả vé 10% giá vé.',
            'Từ 4 giờ đến dưới 24 giờ trước giờ tàu chạy: phí trả vé 20% giá vé.',
            'Dưới 4 giờ trước giờ tàu chạy, hoặc khi tàu đã chạy: không nhận trả vé.',
          ],
          paragraphs: [
            'Giá vé là số tiền ghi cho từng vé trên đơn đặt của quý khách. Giờ tàu chạy là giờ tàu rời ga lên tàu ghi trên vé; thời điểm tính phí là lúc Violette nhận được yêu cầu (giờ Việt Nam). Với cabin đặt trọn, phí được tính trên từng vé của cabin.',
          ],
        },
        {
          heading: 'Vé giảm giá và vé đoàn',
          paragraphs: [
            'Vé mua theo chương trình giảm giá của ĐSVN (ví dụ giảm giá khi mua sớm) và vé đoàn có thể có thời hạn và mức phí đổi, trả riêng, thường cao hơn hoặc chỉ nhận trước 72 giờ. Nếu đơn của quý khách thuộc trường hợp này, Violette ghi rõ khi xác nhận đặt vé.',
          ],
        },
        {
          heading: 'Đổi vé',
          items: [
            'Chỉ áp dụng cho vé cá nhân, yêu cầu từ 24 giờ trở lên trước giờ tàu chạy.',
            'Có thể đổi ngày đi, tàu hoặc loại chỗ; giữ nguyên tên hành khách, ga đi và ga đến.',
            'Phí đổi 20.000đ/vé. Phần chênh lệch giá giữa vé cũ và vé mới được tính theo quy định của ĐSVN và báo cho quý khách trước khi đổi.',
            'Mỗi vé chỉ được đổi một lần và còn tùy chỗ trống trên chuyến mới.',
          ],
        },
        {
          heading: 'Khi ĐSVN hủy chuyến hoặc đổi giờ tàu',
          paragraphs: [
            'Nếu chuyến tàu bị hủy hoặc lịch chạy thay đổi khiến quý khách không thể đi, Violette hoàn 100% số tiền đã thanh toán cho phần hành trình bị ảnh hưởng, hoặc đổi sang chuyến khác còn chỗ mà không thu phí đổi. Violette liên hệ quý khách qua số điện thoại, WhatsApp hoặc email đã đăng ký ngay khi nhận được thông báo từ ĐSVN.',
          ],
        },
        {
          heading: 'Cách gửi yêu cầu',
          items: [
            `Gọi hotline ${C.phone} hoặc ${C.phoneAlt}.`,
            `Hoặc gửi email tới ${C.email}, ghi mã đặt chỗ, họ tên người đặt và yêu cầu (trả vé hay đổi vé, đổi sang ngày/tàu nào).`,
            'Violette xác nhận yêu cầu và số tiền hoàn hoặc phí đổi trước khi thực hiện.',
          ],
        },
        {
          heading: 'Hoàn tiền',
          paragraphs: [
            'Tiền hoàn được trả về đúng phương thức quý khách đã thanh toán (PayPal, cổng thanh toán trực tuyến hoặc chuyển khoản) trong vòng 7 ngày làm việc kể từ khi Violette xác nhận trả vé. Thời gian tiền về tài khoản sau đó tùy ngân hàng hoặc PayPal. Với đơn thanh toán bằng ngoại tệ qua PayPal, số tiền quý khách nhận lại có thể chênh lệch nhỏ do tỷ giá và phí của PayPal.',
          ],
        },
      ],
    },
    en: {
      title: 'Refund & Exchange Policy',
      description: 'Rules for returning or exchanging train tickets booked with Violette Train, and how refunds are paid.',
      intro:
        `Tickets booked on this site are Vietnam Railways (DSVN) tickets that ${C.legalName.en} books and issues for you. ` +
        'Exchanges and returns therefore follow the DSVN rules in force when the ticket is issued. The fees below are the ones DSVN currently applies to individual tickets; ' +
        'if DSVN changes them, Violette applies the new rules and tells you before processing your request.',
      sections: [
        {
          heading: 'Before payment',
          paragraphs: [
            'An unpaid booking is only a temporary hold. If you do not pay within the hold period shown when booking or in the payment instructions email, the booking is cancelled automatically at no cost. You can also cancel by phone or email at any time before paying.',
          ],
        },
        {
          heading: 'Returning a paid ticket',
          items: [
            '24 hours or more before departure: return fee of 10% of the ticket price.',
            'From 4 hours to less than 24 hours before departure: return fee of 20% of the ticket price.',
            'Less than 4 hours before departure, or after the train has left: returns are not accepted.',
          ],
          paragraphs: [
            'The ticket price is the amount shown for each ticket on your booking. Departure time is when the train leaves your boarding station, as printed on the ticket; the fee is based on when Violette receives your request (Vietnam time). For a whole cabin, the fee applies to each ticket in the cabin.',
          ],
        },
        {
          heading: 'Discounted and group tickets',
          paragraphs: [
            'Tickets sold under a DSVN discount (for example early-booking discounts) and group tickets may have their own deadlines and fees, which are usually higher or only accepted up to 72 hours before departure. If your booking falls under these rules, Violette says so when confirming it.',
          ],
        },
        {
          heading: 'Exchanging a ticket',
          items: [
            'Individual tickets only, requested 24 hours or more before departure.',
            'You can change the travel date, train or seat type; the passenger name and the departure and arrival stations stay the same.',
            'Exchange fee: 20,000 VND per ticket. Any fare difference between the old and new ticket follows DSVN rules and is confirmed with you before the exchange.',
            'Each ticket can be exchanged once, subject to availability on the new train.',
          ],
        },
        {
          heading: 'If DSVN cancels or reschedules a train',
          paragraphs: [
            'If your train is cancelled or its schedule changes so that you cannot travel, Violette refunds 100% of what you paid for the affected journey, or moves you to another train with free seats at no exchange fee. Violette contacts you by the phone, WhatsApp or email on your booking as soon as DSVN notifies us.',
          ],
        },
        {
          heading: 'How to make a request',
          items: [
            `Call our hotline ${C.phone} or ${C.phoneAlt}.`,
            `Or email ${C.email} with your booking reference, the booker's name and what you need (return, or exchange to which date/train).`,
            'Violette confirms the request and the refund amount or exchange fee before acting on it.',
          ],
        },
        {
          heading: 'Refunds',
          paragraphs: [
            'Refunds go back to the payment method you used (PayPal, online payment gateway or bank transfer) within 7 working days after Violette confirms the return. How long the money then takes to reach you depends on your bank or PayPal. For bookings paid in a foreign currency through PayPal, the amount you receive may differ slightly because of exchange rates and PayPal fees.',
          ],
        },
      ],
    },
  },

  terms: {
    vi: {
      title: 'Điều khoản dịch vụ',
      description: 'Điều khoản đặt vé, thanh toán và đi tàu khi sử dụng dịch vụ của Violette Train.',
      intro: 'Khi đặt vé trên trang này, quý khách đồng ý với các điều khoản dưới đây. Vui lòng đọc cùng Chính sách hoàn, đổi vé và Chính sách bảo mật.',
      sections: [
        {
          heading: 'Đơn vị cung cấp dịch vụ',
          paragraphs: [
            `${C.legalName.vi} (${C.legalName.en}), mã số thuế ${C.taxCode}, địa chỉ ${C.address.vi}. Liên hệ: ${contactVi}.`,
          ],
        },
        {
          heading: 'Dịch vụ',
          paragraphs: [
            'Violette cung cấp dịch vụ đặt vé và cabin trên các đoàn tàu của Tổng công ty Đường sắt Việt Nam (ĐSVN). Lịch chạy, giờ tàu và giá vé cơ sở do ĐSVN công bố và được Violette cập nhật hằng ngày. Việc vận chuyển hành khách do ĐSVN thực hiện.',
          ],
        },
        {
          heading: 'Đặt chỗ',
          items: [
            'Quý khách cung cấp đúng họ tên từng hành khách như trên giấy tờ tùy thân mang theo khi đi tàu, cùng email và số điện thoại liên lạc của người đặt.',
            'Sau khi gửi đơn, chỗ được giữ tạm trong thời hạn hiển thị khi đặt vé hoặc trong email hướng dẫn thanh toán. Hết thời hạn mà chưa thanh toán, đơn tự hủy.',
            'Vé chỉ có hiệu lực khi đơn đã thanh toán đủ và Violette gửi email xác nhận.',
            'Nếu chỗ đã chọn không còn khi xuất vé, Violette đề xuất chỗ tương đương hoặc hoàn toàn bộ số tiền đã thanh toán.',
          ],
        },
        {
          heading: 'Giá và thanh toán',
          items: [
            'Giá niêm yết bằng đồng Việt Nam, tính cho mỗi vé (mỗi giường hoặc ghế), chưa gồm VAT 10%. VAT được cộng vào tổng tiền khi thanh toán.',
            'Giá có thể khác nhau theo ngày, tàu, chặng và loại chỗ. Giá áp dụng là giá hiển thị khi quý khách gửi đơn.',
            'Quý khách thanh toán theo hướng dẫn gửi qua email (PayPal), hoặc qua cổng thanh toán trực tuyến khi trang có hỗ trợ. Violette không nhận và không lưu thông tin thẻ của quý khách.',
            'Cần hóa đơn VAT, vui lòng gửi thông tin xuất hóa đơn (tên đơn vị, mã số thuế, địa chỉ) qua email khi thanh toán.',
          ],
        },
        {
          heading: 'Khi đi tàu',
          items: [
            'Có mặt tại ga ít nhất 30 phút trước giờ tàu chạy. Tại ga Hà Nội, quầy check-in của Violette ở Cổng 16, Sảnh C, Tầng 1, 120 Lê Duẩn.',
            'Mang theo giấy tờ tùy thân có ảnh, đúng tên trên vé (căn cước, hộ chiếu...). Nhân viên ĐSVN có thể kiểm tra khi lên tàu.',
            'Tuân thủ quy định đi tàu của ĐSVN về hành lý, trẻ em và hàng cấm.',
          ],
        },
        {
          heading: 'Thay đổi lịch tàu',
          paragraphs: [
            'Lịch chạy do ĐSVN điều hành và có thể thay đổi. Violette báo cho quý khách sớm nhất có thể và xử lý theo Chính sách hoàn, đổi vé. Violette không chịu trách nhiệm cho các chi phí khác phát sinh (khách sạn, tour, vé máy bay...) khi tàu chậm hoặc hủy chuyến vì lý do ngoài khả năng kiểm soát của Violette.',
          ],
        },
        {
          heading: 'Nội dung trên trang',
          paragraphs: [
            'Hình ảnh cabin mang tính minh họa; trang bị thực tế có thể khác đôi chút giữa các toa. Bài viết trên blog chỉ để tham khảo.',
          ],
        },
        {
          heading: 'Khiếu nại và tranh chấp',
          paragraphs: [
            `Mọi thắc mắc, khiếu nại vui lòng gửi qua ${contactVi}. Hai bên ưu tiên thương lượng; nếu không thỏa thuận được, tranh chấp được giải quyết theo pháp luật Việt Nam.`,
          ],
        },
        {
          heading: 'Cập nhật điều khoản',
          paragraphs: [
            'Violette có thể cập nhật điều khoản này. Đơn của quý khách áp dụng bản điều khoản có hiệu lực khi quý khách gửi đơn.',
          ],
        },
      ],
    },
    en: {
      title: 'Terms of Service',
      description: 'Terms for booking, paying for and travelling with Violette Train.',
      intro: 'By booking on this site you agree to the terms below. Please read them together with our Refund & Exchange Policy and Privacy Policy.',
      sections: [
        {
          heading: 'Who provides the service',
          paragraphs: [
            `${C.legalName.en} (${C.legalName.vi}), tax code ${C.taxCode}, registered at ${C.address.en}. Contact: ${contactEn}.`,
          ],
        },
        {
          heading: 'The service',
          paragraphs: [
            'Violette books tickets and cabins on trains run by Vietnam Railways (DSVN). Timetables, departure times and base fares are published by DSVN and updated by Violette every day. The journey itself is operated by DSVN.',
          ],
        },
        {
          heading: 'Bookings',
          items: [
            "Give each passenger's full name exactly as on the ID they will carry on the train, plus the booker's email and phone number.",
            'Once you submit a booking, seats are held for the period shown when booking or in the payment instructions email. If payment does not arrive in time, the booking is cancelled automatically.',
            'A ticket is valid only once the booking is paid in full and Violette has sent a confirmation email.',
            'If the seats you chose are no longer available when the ticket is issued, Violette offers equivalent seats or refunds everything you paid.',
          ],
        },
        {
          heading: 'Prices and payment',
          items: [
            'Prices are in Vietnamese dong per ticket (per berth or seat) and exclude 10% VAT, which is added to the total at checkout.',
            'Prices vary by date, train, route and seat type. The price that applies is the one shown when you submit your booking.',
            'You pay by following the instructions in our email (PayPal), or through an online payment gateway where the site offers one. Violette never receives or stores your card details.',
            'If you need a VAT invoice, email us your company name, tax code and address when you pay.',
          ],
        },
        {
          heading: 'On the day of travel',
          items: [
            "Arrive at the station at least 30 minutes before departure. At Ha Noi station, Violette's check-in desk is at Gate 16, Hall C, Floor 1, 120 Le Duan.",
            'Carry photo ID matching the name on the ticket (national ID card, passport...). DSVN staff may check it when boarding.',
            'Follow DSVN rules on luggage, children and prohibited items.',
          ],
        },
        {
          heading: 'Schedule changes',
          paragraphs: [
            'Timetables are run by DSVN and can change. Violette tells you as early as possible and handles it under the Refund & Exchange Policy. Violette is not liable for other costs (hotels, tours, flights...) caused by delays or cancellations outside its control.',
          ],
        },
        {
          heading: 'Site content',
          paragraphs: [
            'Cabin photos are illustrative; fittings can differ slightly between carriages. Blog articles are for general information only.',
          ],
        },
        {
          heading: 'Complaints and disputes',
          paragraphs: [
            `Send any question or complaint via ${contactEn}. Both sides will first try to settle it by negotiation; failing that, disputes are resolved under Vietnamese law.`,
          ],
        },
        {
          heading: 'Changes to these terms',
          paragraphs: [
            'Violette may update these terms. Your booking is governed by the version in force when you submitted it.',
          ],
        },
      ],
    },
  },

  privacy: {
    vi: {
      title: 'Chính sách bảo mật',
      description: 'Cách Violette Train thu thập, sử dụng và bảo vệ dữ liệu cá nhân của quý khách.',
      intro: `${C.legalName.vi} (MST ${C.taxCode}) chịu trách nhiệm về dữ liệu cá nhân quý khách cung cấp trên trang này. Chính sách này giải thích chúng tôi thu thập gì, dùng để làm gì và quý khách có những quyền nào.`,
      sections: [
        {
          heading: 'Dữ liệu chúng tôi thu thập',
          items: [
            'Khi đặt vé: họ tên, loại hành khách (người lớn/trẻ em) và ngày sinh nếu quý khách cung cấp; email, số điện thoại và số WhatsApp của người đặt; hành trình, chỗ đã chọn và số tiền.',
            'Khi thanh toán: mã giao dịch và trạng thái thanh toán do PayPal hoặc cổng thanh toán gửi về. Violette không nhận và không lưu số thẻ hay mật khẩu tài khoản thanh toán.',
            'Khi gửi form liên hệ hoặc đăng ký nhận tin: tên, email, số điện thoại (nếu có) và nội dung quý khách gửi.',
            'Dữ liệu kỹ thuật: nhật ký truy cập cơ bản của máy chủ (địa chỉ IP, thời gian, trang đã mở) để vận hành trang và chống lạm dụng.',
          ],
        },
        {
          heading: 'Mục đích sử dụng',
          items: [
            'Giữ chỗ, xuất vé với ĐSVN và gửi email xác nhận, hướng dẫn thanh toán.',
            'Liên hệ khi lịch tàu thay đổi hoặc khi cần xác minh đơn.',
            'Hỗ trợ khách hàng, xử lý đổi, trả vé và hoàn tiền.',
            'Lập chứng từ, hóa đơn và lưu trữ theo quy định kế toán, thuế.',
            'Gửi bản tin, ưu đãi, chỉ khi quý khách đăng ký và có thể hủy bất cứ lúc nào.',
          ],
        },
        {
          heading: 'Chia sẻ dữ liệu',
          paragraphs: ['Violette không bán dữ liệu cá nhân. Chúng tôi chỉ chia sẻ phần cần thiết với:'],
          items: [
            'Tổng công ty Đường sắt Việt Nam: tên hành khách và hành trình để xuất vé.',
            'PayPal hoặc cổng thanh toán: số tiền và mã đơn để xử lý thanh toán, hoàn tiền.',
            'Nhà cung cấp hạ tầng: Vercel (lưu trữ trang web), Supabase (cơ sở dữ liệu, máy chủ tại Hàn Quốc), Google (gửi và nhận email).',
            'Cơ quan nhà nước có thẩm quyền khi pháp luật yêu cầu.',
          ],
        },
        {
          heading: 'Lưu trữ và chuyển dữ liệu ra nước ngoài',
          paragraphs: [
            'Dữ liệu đơn hàng được lưu trên máy chủ của Supabase tại Seoul (Hàn Quốc) và có thể đi qua máy chủ của Vercel, Google ở nước ngoài. Khi đặt vé, quý khách đồng ý với việc chuyển dữ liệu này để thực hiện dịch vụ.',
            'Dữ liệu đơn hàng và chứng từ được giữ trong thời hạn pháp luật về kế toán, thuế yêu cầu. Dữ liệu liên hệ và bản tin được giữ đến khi quý khách yêu cầu xóa hoặc hủy đăng ký.',
          ],
        },
        {
          heading: 'Cookie',
          paragraphs: [
            'Trang chỉ dùng cookie cần thiết: ghi nhớ ngôn ngữ và duy trì đăng nhập trang quản trị. Chúng tôi không dùng cookie quảng cáo hay công cụ theo dõi của bên thứ ba.',
          ],
        },
        {
          heading: 'Bảo mật',
          paragraphs: [
            'Dữ liệu được truyền qua kết nối mã hóa HTTPS; chỉ nhân viên được phân quyền mới xem được đơn hàng. Không hệ thống nào an toàn tuyệt đối; nếu xảy ra sự cố ảnh hưởng tới dữ liệu của quý khách, chúng tôi sẽ thông báo theo quy định.',
          ],
        },
        {
          heading: 'Quyền của quý khách',
          items: [
            'Xem và nhận bản sao dữ liệu chúng tôi đang lưu về quý khách.',
            'Yêu cầu sửa dữ liệu chưa đúng.',
            'Yêu cầu xóa dữ liệu hoặc rút lại sự đồng ý, trừ phần pháp luật buộc phải lưu (ví dụ chứng từ kế toán).',
            'Từ chối nhận email quảng cáo.',
          ],
          paragraphs: [
            `Gửi yêu cầu qua ${contactVi}. Chúng tôi có thể cần xác minh danh tính trước khi xử lý và sẽ phản hồi trong thời hạn pháp luật về bảo vệ dữ liệu cá nhân quy định.`,
          ],
        },
        {
          heading: 'Hành khách trẻ em',
          paragraphs: [
            'Thông tin của hành khách trẻ em do cha mẹ hoặc người giám hộ cung cấp khi đặt vé và chỉ dùng để xuất vé.',
          ],
        },
        {
          heading: 'Thay đổi chính sách',
          paragraphs: ['Khi chính sách này thay đổi, ngày cập nhật ở đầu trang sẽ thay đổi theo.'],
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      description: 'How Violette Train collects, uses and protects your personal data.',
      intro: `${C.legalName.en} (tax code ${C.taxCode}) is responsible for the personal data you give us on this site. This policy explains what we collect, why, and what rights you have.`,
      sections: [
        {
          heading: 'What we collect',
          items: [
            "When you book: each passenger's name, passenger type (adult/child) and date of birth if you provide it; the booker's email, phone and WhatsApp number; the journey, seats chosen and amount.",
            'When you pay: the transaction reference and status sent back by PayPal or the payment gateway. Violette never receives or stores card numbers or payment account passwords.',
            'When you use the contact or newsletter form: your name, email, phone (if given) and message.',
            'Technical data: basic server access logs (IP address, time, page visited) to run the site and prevent abuse.',
          ],
        },
        {
          heading: 'Why we use it',
          items: [
            'To hold seats, issue tickets with DSVN and send confirmation and payment emails.',
            'To contact you about schedule changes or to verify a booking.',
            'To support you and handle exchanges, returns and refunds.',
            'To keep records and invoices as accounting and tax law requires.',
            'To send newsletters and offers, only if you subscribe, and you can unsubscribe at any time.',
          ],
        },
        {
          heading: 'Who we share it with',
          paragraphs: ['Violette does not sell personal data. We share only what is needed with:'],
          items: [
            'Vietnam Railways (DSVN): passenger names and journeys, to issue tickets.',
            'PayPal or the payment gateway: amount and booking reference, to process payments and refunds.',
            'Infrastructure providers: Vercel (website hosting), Supabase (database, servers in South Korea), Google (sending and receiving email).',
            'Competent authorities when the law requires it.',
          ],
        },
        {
          heading: 'Storage and transfers abroad',
          paragraphs: [
            'Booking data is stored on Supabase servers in Seoul (South Korea) and may pass through Vercel and Google servers abroad. By booking, you agree to this transfer so that we can provide the service.',
            'Booking and accounting records are kept for as long as accounting and tax law requires. Contact and newsletter data are kept until you ask us to delete them or unsubscribe.',
          ],
        },
        {
          heading: 'Cookies',
          paragraphs: [
            'The site uses only necessary cookies: to remember your language and to keep staff signed in to the admin area. We do not use advertising cookies or third-party trackers.',
          ],
        },
        {
          heading: 'Security',
          paragraphs: [
            'Data travels over encrypted HTTPS connections, and only authorised staff can see bookings. No system is completely secure; if an incident affects your data, we will notify you as the law requires.',
          ],
        },
        {
          heading: 'Your rights',
          items: [
            'See and get a copy of the data we hold about you.',
            'Ask us to correct inaccurate data.',
            'Ask us to delete your data or withdraw consent, except where the law requires us to keep it (for example accounting records).',
            'Opt out of marketing emails.',
          ],
          paragraphs: [
            `Send requests via ${contactEn}. We may need to verify your identity first and will respond within the time limits set by Vietnamese personal data protection law.`,
          ],
        },
        {
          heading: 'Child passengers',
          paragraphs: [
            "A child passenger's details are provided by a parent or guardian when booking and are used only to issue the ticket.",
          ],
        },
        {
          heading: 'Changes to this policy',
          paragraphs: ['When this policy changes, the "last updated" date at the top of the page changes too.'],
        },
      ],
    },
  },
}
