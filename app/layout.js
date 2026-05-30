import './globals.css';

export const metadata = {
  title: 'Control de Jornada Laboral',
  description: 'Controla tus días trabajados, pagos y cortes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
