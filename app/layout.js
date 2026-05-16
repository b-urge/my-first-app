import "./globals.css";

export const metadata = {
  title: "AI Quiz Studio",
  description: "Generate course quizzes from uploaded materials and context.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
