import "./globals.css"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { AuthProvider } from "../components/AuthProvider"
import AuthGate from "../components/AuthGate"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <AuthGate>
            <main className="min-h-screen py-4">{children}</main>
          </AuthGate>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
