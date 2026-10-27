import { PageHeader } from "@/components/page-header";
import { QrScanner } from "@/components/qr-scanner";

export const metadata = { title: "Escanear nota · PricePulse" };

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Escanear nota" subtitle="Leia o QR Code da NFC-e" />
      <QrScanner />
    </>
  );
}
