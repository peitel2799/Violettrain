// ─── Shared types for the booking + bank reconciliation system ─────────────────

// ─── Booking (Đoàn / Group Booking) ───────────────────────────────────────────

export type BookingStatus = 'pending' | 'partial' | 'paid' | 'cancelled'

export interface Booking {
  id: string
  // Group / Company info
  companyName: string
  companyContact: string
  companyPhone: string
  companyEmail: string
  taxCode: string           // MST - mã số thuế
  // Booking details
  bookingDate: string       // ngày đặt
  departureDate: string     // ngày khởi hành
  trainNumber: string       // số hiệu tàu
  route: string             // tuyến đường
  carriage: string         // toa
  // Passenger summary
  totalTickets: number      // tổng số vé
  unitPrice: number         // đơn giá trung bình
  totalAmount: number       // tổng tiền phải thanh toán
  paymentMethod: string     // TM, CARD, CK, ...
  // Payment tracking
  paidAmount: number        // số tiền đã thanh toán (từ ngân hàng)
  paidDate: string | null
  // Reconciliation
  matchedTransactionIds: string[]  // IDs of bank transactions matched to this booking
  status: BookingStatus
  notes: string
  // Meta
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  auditLog: AuditLogEntry[]
}

// ─── Bank Transaction (Giao dịch ngân hàng) ─────────────────────────────────

export type BankAccount = 'VCB' | 'VIB' | 'TECK' | 'VTIN' | 'other'

export interface BankTransaction {
  id: string
  bankAccount: BankAccount
  transactionDate: string
  description: string        // nội dung chuyển khoản
  credit: number           // số tiền vào (có)
  debit: number            // số tiền ra (nợ)
  runningBalance: number   // số dư sau giao dịch
  ref: string              // tham chiếu / reference
  category: string         // đại lý, công ty, ...
  // Matching
  matchedBookingIds: string[]
  notes: string
  // Meta
  createdBy: string
  createdAt: string
  auditLog: AuditLogEntry[]
}

// ─── Audit Log Entry ───────────────────────────────────────────────────────────

export interface AuditLogEntry {
  at: string
  by: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MATCH' | 'UNMATCH'
  changes?: Record<string, { from: unknown; to: unknown }>
}

// ─── Debt Summary (Công nợ) ──────────────────────────────────────────────────

export interface DebtSummary {
  companyName: string
  totalBookings: number
  totalAmount: number
  totalPaid: number
  totalDebt: number          // totalAmount - totalPaid
  bookings: DebtBooking[]
}

export interface DebtBooking {
  id: string
  departureDate: string
  trainNumber: string
  route: string
  totalTickets: number
  totalAmount: number
  paidAmount: number
  debt: number               // totalAmount - paidAmount
  status: BookingStatus
  lastPaymentDate: string | null
}

// ─── Reconciliation (Đối soát) ──────────────────────────────────────────────

export interface ReconcileResult {
  matched: number
  unmatched: number
  totalCredit: number
  totalDebt: number
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface BookingListResponse {
  items: Booking[]
  total: number
  page: number
  pages: number
  stats: {
    totalAmount: number
    totalPaid: number
    totalDebt: number
    byStatus: Record<BookingStatus, { count: number; amount: number }>
  }
}

export interface BankTransactionListResponse {
  items: BankTransaction[]
  total: number
  page: number
  pages: number
  stats: {
    totalCredit: number
    totalDebit: number
    matchedCount: number
    unmatchedCount: number
  }
}

export interface DebtResponse {
  debts: DebtSummary[]
  overallTotalDebt: number
  overallTotalAmount: number
  overallTotalPaid: number
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}
