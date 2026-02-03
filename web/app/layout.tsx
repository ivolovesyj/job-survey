import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "채용공고 관리의 모든 것, 지원함",
  description: "흩어진 채용 공고부터 합격 현황까지, 한곳에서 체계적으로 관리하세요!",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  metadataBase: new URL('https://jiwonham.vercel.app'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '687x687', type: 'image/png' },
    ],
    apple: '/favicon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://jiwonham.vercel.app',
    siteName: '지원함',
    title: '채용공고 관리의 모든 것, 지원함',
    description: '흩어진 채용 공고부터 합격 현황까지, 한곳에서 체계적으로 관리하세요!',
    images: [{
      url: 'https://jiwonham.vercel.app/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: '지원함 - 채용공고 관리 서비스',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '채용공고 관리의 모든 것, 지원함',
    description: '흩어진 채용 공고부터 합격 현황까지, 한곳에서 체계적으로 관리하세요!',
    images: ['https://jiwonham.vercel.app/twitter-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
