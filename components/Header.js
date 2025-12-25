// components/Header.js
import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-blue-500 text-white p-4">
      <nav className="flex justify-between">
        <div className="font-bold">Volleyball Community</div>
        <div className="space-x-4">
          <Link href="/">Home</Link>
          <Link href="/posts">게시판</Link>
          <Link href="/games">게임 모집</Link>
          <Link href="/map">지도</Link>
          <Link href="/login">Login</Link>
        </div>
      </nav>
    </header>
  )
}
