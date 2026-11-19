import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CampusNotes",
  description: "CampusNotes – course notes, AI summaries and practice quizzes for PTUT students.",
  icons: { icon: "/logos/campusnotes.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved theme before the first paint so the page never flashes white. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('cn_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}" }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
