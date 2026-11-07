import "./globals.css";

export const metadata = {
  title: "ToDo リスト",
  description: "シンプルな ToDo リストアプリ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
