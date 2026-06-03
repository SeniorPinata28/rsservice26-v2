import Link from 'next/link'
export default function Header(){return <header className="header"><nav className="nav"><Link className="brand" href="/">RSService26</Link><div className="links"><Link href="/services">Услуги</Link><Link href="/parts">Запчасти</Link><Link href="/cart">Корзина</Link><Link href="/contact">Контакты</Link><Link href="/admin">Админка</Link></div></nav></header>}
