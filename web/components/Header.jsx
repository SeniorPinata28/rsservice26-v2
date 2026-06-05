'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

export default function Header(){
  const pathname=usePathname();
  const isHome=pathname==='/'
  return <header className={isHome?'siteShell siteShellHome':'siteShell'}>
    <nav className="commandNav">
      <Link className="brandUnit" href="/">
        <span className="brandSign">RS</span>
        <span className="brandText"><b>RSService26</b><small>Hyundai / Kia · Ставрополь</small></span>
      </Link>
      <div className="navRail">
        <Link href="/availability">Запчасть</Link>
        <Link href="/services">Сервис</Link>
        <Link href="/parts">Каталог</Link>
        <Link href="/contact">Контакты</Link>
      </div>
      <div className="navTools">
        <Link className="ghostTool" href="/cart">Подбор</Link>
        <a className="phoneTool" href="tel:+79679677042">+7 967 967-70-42</a>
        <Link className="bookTool" href="/booking">Записаться</Link>
      </div>
    </nav>
  </header>
}
