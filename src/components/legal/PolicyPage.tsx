import type { Metadata } from 'next'
import { Link } from '@/i18n/routing'
import { COMPANY, companyLocale } from '@/lib/company'
import { POLICIES, POLICY_PATHS, POLICY_UPDATED, type PolicyKey } from '@/lib/policies'

const OTHER_LABELS: Record<'vi' | 'en', Record<PolicyKey, string>> = {
  vi: { refund: 'Chính sách hoàn, đổi vé', terms: 'Điều khoản dịch vụ', privacy: 'Chính sách bảo mật' },
  en: { refund: 'Refund & Exchange Policy', terms: 'Terms of Service', privacy: 'Privacy Policy' },
}

export function policyMetadata(policy: PolicyKey, locale: string): Metadata {
  const doc = POLICIES[policy][companyLocale(locale)]
  return { title: doc.title, description: doc.description }
}

function formatUpdated(locale: 'vi' | 'en') {
  const [year, month, day] = POLICY_UPDATED.split('-')
  return locale === 'vi' ? `${day}/${month}/${year}` : `${day} ${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month)]} ${year}`
}

export default function PolicyPage({ policy, locale }: { policy: PolicyKey; locale: string }) {
  const lang = companyLocale(locale)
  const doc = POLICIES[policy][lang]
  const others = (Object.keys(POLICY_PATHS) as PolicyKey[]).filter((key) => key !== policy)

  return (
    <div className="min-h-screen bg-white">
      {/* Extra top padding: the site header is fixed and sits over the top of this band. */}
      <section className="bg-violet-950 px-4 pb-12 pt-28 text-center md:pb-16 md:pt-36">
        <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-white/60">
          {lang === 'vi' ? 'Cập nhật' : 'Last updated'}: {formatUpdated(lang)}
        </p>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <p className="text-base leading-relaxed text-gray-700 md:text-lg">{doc.intro}</p>

        {doc.sections.map((section, index) => (
          <section key={section.heading} className="mt-10">
            <h2 className="font-serif text-xl font-bold text-gray-900 md:text-2xl">
              {index + 1}. {section.heading}
            </h2>
            {section.items && (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700 marker:text-gold-500">
                {section.items.map((item) => (
                  <li key={item} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            )}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-4 leading-relaxed text-gray-700">{paragraph}</p>
            ))}
          </section>
        ))}

        <aside className="mt-14 rounded-2xl border border-violet-100 bg-violet-50/60 p-6 text-sm leading-relaxed text-gray-700">
          <p className="font-semibold text-gray-900">{COMPANY.legalName[lang]}</p>
          <p>{lang === 'vi' ? 'Mã số thuế' : 'Tax code'}: {COMPANY.taxCode}</p>
          <p>{lang === 'vi' ? 'Địa chỉ' : 'Address'}: {COMPANY.address[lang]}</p>
          <p>
            Hotline: <a className="text-violet-700 hover:underline" href={`tel:${COMPANY.phone.replace(/\s/g, '')}`}>{COMPANY.phone}</a>
            {' · '}
            <a className="text-violet-700 hover:underline" href={`tel:${COMPANY.phoneAlt.replace(/\s/g, '')}`}>{COMPANY.phoneAlt}</a>
          </p>
          <p>
            Email: <a className="text-violet-700 hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </p>
        </aside>

        <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {others.map((key) => (
            <Link key={key} href={POLICY_PATHS[key]} className="font-medium text-violet-700 hover:underline">
              {OTHER_LABELS[lang][key]} →
            </Link>
          ))}
        </nav>
      </article>
    </div>
  )
}
