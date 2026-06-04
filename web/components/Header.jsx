import Link from 'next/link'

export default function Header(){
  return <header className="header">
    <nav className="nav">
      <Link className="brand" href="/">
        <span className="brandMark">RS</span>
        <span><b>RSService26</b><small>Hyundai / Kia · Ставрополь</small></span>
      </Link>
      <div className="links mainLinks">
        <Link href="/services">Услуги</Link>
        <Link href="/parts">Запчасти</Link>
        <Link className="navPrimary" href="/availability">Проверить наличие</Link>
        <Link href="/cart">Корзина</Link>
        <Link href="/contact">Контакты</Link>
      </div>
      <div className="headerActions">
        <a className="phoneLink" href="tel:+79679677042">+7 (967) 967-70-42</a>
        <Link className="adminLink" href="/admin">Админка</Link>
        <Link className="adminLink" href="/setup">Настройка</Link>
      </div>
    </nav>
  </header>
}
