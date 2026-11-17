import type { Metadata } from 'next'

// The blog list page is a client component, so its title lives here.
// Article pages (/blog/[slug]) set their own title and description.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isVi = locale === 'vi'
  return {
    title: 'Blog',
    description: isVi
      ? 'Kinh nghiệm du lịch bằng tàu hỏa: Sapa, Ninh Bình, Huế, Đà Nẵng và hành trình Bắc – Nam cùng Violette Train.'
      : 'Train travel guides for Sapa, Ninh Binh, Hue, Da Nang and the North–South line with Violette Train.',
  }
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
