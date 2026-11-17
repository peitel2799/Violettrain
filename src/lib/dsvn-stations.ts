/**
 * Focus stations whose schedules and fares are read from DSVN's public pages
 * (giotaugiave.dsvn.vn), keyed by DSVN station code. Kept free of browser
 * dependencies so API routes can import it without loading the crawler.
 *
 * Lines read: "Tàu khách Bắc Nam" (SE1–SE12, SE23/24…), "Hà Nội, Vinh, Huế,
 * Đà Nẵng" (SE19/20, SE17/18, HĐ…) and "Hà Nội – Lào Cai" (SP…).
 */
export const DSVN_SYNCED_STATIONS: Record<string, string> = {
  HNO: 'Hà Nội',
  LCA: 'Lào Cai',
  NBI: 'Ninh Bình',
  DHO: 'Đồng Hới',
  HUE: 'Huế',
  DNA: 'Đà Nẵng',
  NTR: 'Nha Trang',
  SGO: 'Sài Gòn',
}

export function isCrawledStation(code: string) {
  return code in DSVN_SYNCED_STATIONS
}

export function isRouteAutoSynced(fromCode: string, toCode: string) {
  return isCrawledStation(fromCode) && isCrawledStation(toCode)
}
