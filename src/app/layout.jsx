import { Fraunces, IBM_Plex_Sans } from 'next/font/google';
import Script from 'next/script';
import bannerOg from '@/assets/images/banner_og.jpeg';
import './globals.css';

const GA_MEASUREMENT_ID = 'G-15544DM2DE';
const SITE_URL = 'https://canvastools.apps.webtech.network/';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600'],
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'CanvasTools',
  description: 'Importação em lote de questões para quizzes do Canvas LMS',
  openGraph: {
    title: 'Canvas Tools',
    description: 'Um único painel com as informações relevantes para facilitar o acompanhamento da sua rotina acadêmica.',
    url: SITE_URL,
    siteName: 'Canvas Tools | WebTech Network',
    images: [{ url: bannerOg.src, width: bannerOg.width, height: bannerOg.height }],
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
