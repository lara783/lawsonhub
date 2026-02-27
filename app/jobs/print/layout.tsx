// Bypass the main app layout so the print page is a clean standalone document
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
