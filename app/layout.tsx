import "./globals.css";

// Root layout — minimal shell. Actual layout is in app/[locale]/layout.tsx
// This exists so Next.js doesn't complain about missing root layout.
// API routes and /telegram don't need i18n.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
