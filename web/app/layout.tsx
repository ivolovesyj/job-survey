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
  description: "흩어진 채용 공고부터 합격 현황까지. 수동 입력 없이 한곳에서 체계적으로 관리하세요.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  metadataBase: new URL('https://jiwonham.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://jiwonham.vercel.app',
    siteName: '지원함',
    title: '채용공고 관리의 모든 것, 지원함',
    description: '흩어진 채용 공고부터 합격 현황까지. 수동 입력 없이 한곳에서 체계적으로 관리하세요.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '채용공고 관리의 모든 것, 지원함',
    description: '흩어진 채용 공고부터 합격 현황까지. 수동 입력 없이 한곳에서 체계적으로 관리하세요.',
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
