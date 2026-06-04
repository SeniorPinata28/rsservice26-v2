'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

export default function Header(){
  const pathname=usePathname();
  const isHome=pathname==='/'
  return <header className={isHome?'header headerDark':'header'}>
    <nav className="nav">
      <Link className="brand" href="/">
        <span className="brandMark">RS</span>
        <span><b>RSService26</b><small>Сервис и запчасти для Hyundai и Kia</small></span>
      </Link>
      <div className="links mainLinks">
        <Link href="/">Главная</Link>
        <Link href="/availability">Проверить запчасть</Link>
        <Link href="/parts">Каталог</Link>
        <Link href="/services">Услуги</Link>
        <Link className="navPrimary" href="/booking">Записаться</Link>
        <Link href="/contact">Контакты</Link>
      </div>
      <div className="headerActions">
        <Link className="iconLink" href="/availability" aria-label="Поиск">⌕</Link>
        <Link className="iconLink" href="/cart" aria-label="Подбор">🧾</Link>
        <a className="phoneLink" href="tel:+79679677042">+7 (967) 967-70-42<span>ежедневно 9:00–20:00</span></a>
      </div>
    </nav>
  </header>
}
