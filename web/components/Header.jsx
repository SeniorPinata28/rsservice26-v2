import Link from 'next/link'

export default function Header(){
  const cabinetEnabled=process.env.NEXT_PUBLIC_CABINET_ENABLED==='true';
  return <header className="header">
    <nav className="nav">
      <Link className="brand" href="/">
        <img src="/brand/rs-logo.webp" alt="RS Service 26"/>
      </Link>
      <div className="links mainLinks">
        <Link href="/parts">Запчасти</Link>
        <Link href="/services">Сервис</Link>
        <Link href="/services">Прайс</Link>
        <Link href="/#offers">Акции</Link>
        <Link href="/#about">О нас</Link>
        <Link href="/contact">Контакты</Link>
        {cabinetEnabled&&<Link href="/cabinet">Кабинет</Link>}
      </div>
      <div className="headerActions">
        <a className="phoneLink" href="tel:+79679677042">+7 (967) 967-70-42<span>ежедневно 9:00–20:00</span></a>
        <a className="iconLink" href="/contact" aria-label="Написать менеджеру">➤</a>
        {cabinetEnabled&&<Link className="cabinetLink" href="/cabinet">Личный кабинет</Link>}
      </div>
    </nav>
  </header>
}
