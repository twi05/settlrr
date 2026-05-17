export function isValidUpiId(upiId: string): boolean {
  const trimmed = upiId.trim();
  if (!trimmed.includes("@")) return false;
  const [handle, provider] = trimmed.split("@");
  return Boolean(handle) && Boolean(provider);
}

type UpiLinkInput = {
  upiId: string;
  payeeName: string;
  amount: number;
  note?: string;
};

export function createUpiDeepLink({
  upiId,
  payeeName,
  amount,
  note = "Settlrr",
}: UpiLinkInput): string | null {
  if (!isValidUpiId(upiId) || amount <= 0) return null;
  const rounded = Math.round(amount * 100) / 100;
  const am = rounded.toFixed(2);
  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: payeeName,
    am,
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export function isDesktopChrome(): boolean {
  const ua = navigator.userAgent;
  const isChrome =
    ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR");
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return isChrome && !isMobile;
}

export function createUpiQrUrl(upiDeepLink: string): string {
  const encoded = encodeURIComponent(upiDeepLink);
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encoded}`;
}
