import './globals.css';

export const metadata = {
  title: 'cnc-gcode-simulator',
  description: 'cnc-gcode-simulator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
