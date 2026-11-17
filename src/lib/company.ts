/**
 * Legal entity behind violettrain.vn, as registered with the tax authority
 * (MST 0106365191). Policy pages and the footer read from here so the legal
 * details only live in one place.
 */
export const COMPANY = {
  legalName: {
    vi: 'Công ty TNHH Violette Trains Việt Nam',
    en: 'Violette Trains Viet Nam Company Limited',
  },
  taxCode: '0106365191',
  address: {
    vi: '11 Thanh Niên, Ba Đình, Hà Nội',
    en: '11 Thanh Nien Street, Ba Dinh, Ha Noi',
  },
  phone: '091 582 3667',
  phoneAlt: '0947 163 497',
  email: 'violettetrains@gmail.com',
} as const

export type CompanyLocale = keyof typeof COMPANY.legalName

export function companyLocale(locale: string): CompanyLocale {
  return locale === 'vi' ? 'vi' : 'en'
}
