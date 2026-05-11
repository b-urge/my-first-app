import "./globals.css";

export const metadata = {
  title: "Hello World",
  description: "A simple Next.js hello world app.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
