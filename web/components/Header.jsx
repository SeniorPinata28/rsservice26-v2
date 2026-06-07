import Link from 'next/link'

export default function Header(){
  return <header className="header">
    <nav className="nav">
      <Link className="brand" href="/">
        <span className="brandMark">RS</span>
        <span><b>RSService26</b><small>Hyundai / Kia · Ставрополь</small></span>
      </Link>
      <div className="links mainLinks">
        <Link href="/availability">Проверить запчасть</Link>
        <Link href="/booking">Записаться</Link>
        <Link href="/parts">Каталог</Link>
        <Link href="/cabinet">Кабинет</Link>
        <Link href="/contact">Контакты</Link>
      </div>
      <div className="headerActions">
        <a className="phoneLink" href="tel:+79679677042">+7 967 967-70-42<span>позвонить</span></a>
      </div>
    </nav>
  </header>
}
