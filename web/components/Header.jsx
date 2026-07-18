'use client'

import Link from 'next/link'
import {useState} from 'react'

export default function Header(){
  const cabinetEnabled=true;
  const [menuOpen,setMenuOpen]=useState(false);
  const closeMenu=()=>setMenuOpen(false);
  return <header className="header">
    <nav className="nav">
      <Link className="brand" href="/" onClick={closeMenu}>
        <img src="/brand/rs-logo.png" alt="RS Service 26" width="952" height="386"/>
      </Link>
      <div id="main-menu" className={`links mainLinks${menuOpen?' isOpen':''}`}>
        <Link href="/availability" onClick={closeMenu}>Запчасти</Link>
        <Link href="/services" onClick={closeMenu}>Услуги и цены</Link>
        <Link href="/booking" onClick={closeMenu}>Запись на сервис</Link>
        <Link href="/contact" onClick={closeMenu}>Контакты</Link>
      </div>
      <div className="headerActions">
        <a className="phoneLink" href="tel:+79679677042" aria-label="Позвонить в RS Service 26">
          <svg className="phoneIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 3.5 9.5 8 7.8 9.7c1.2 2.5 3.1 4.4 5.6 5.6l1.7-1.7 4.5 2.4v2.7c0 1-0.8 1.8-1.8 1.8C9.9 20.5 3.5 14.1 3.5 6.2c0-1 .8-1.8 1.8-1.8h1.8Z"/></svg>
          <span className="phoneNumber">+7 (967) 967-70-42</span><span className="phoneHours">ежедневно 9:00–20:00</span>
        </a>
        {cabinetEnabled&&<Link className="cabinetLink" href="/cabinet" onClick={closeMenu} aria-label="Личный кабинет">
          <svg className="cabinetIcon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.7-4.1 3.1-6.2 7.5-6.2s6.8 2.1 7.5 6.2"/></svg><span className="cabinetText">Личный кабинет</span>
        </Link>}
        <button className="menuButton" type="button" aria-expanded={menuOpen} aria-controls="main-menu" aria-label={menuOpen?'Закрыть меню':'Открыть меню'} onClick={()=>setMenuOpen(!menuOpen)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{menuOpen?<path d="m6 6 12 12M18 6 6 18"/>:<path d="M4 7h16M4 12h16M4 17h16"/>}</svg>
        </button>
      </div>
    </nav>
  </header>
}
