import "./globals.css"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { AuthProvider } from "../components/AuthProvider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main className="min-h-screen py-4">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
