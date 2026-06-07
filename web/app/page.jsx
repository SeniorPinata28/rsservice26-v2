import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import {services,parts} from '../data';

export default function Home(){
  const topServices=services.slice(0,3);
  const topParts=parts.slice(0,3);
  return <><Header/><main className="main">
    <section className="hero" style={{padding:'56px 46px'}}>
      <span className="badge">Hyundai / Kia · Ставрополь</span>
      <h1>Запчасти и сервис без лишних действий</h1>
      <p>Проверьте наличие детали, оставьте заявку или запишитесь на сервис. Менеджер получит обращение в Telegram и обработает его в админке.</p>
      <div className="heroActions">
        <Link className="btn primary" href="/availability">Проверить запчасть</Link>
        <Link className="btn glass" href="/booking">Записаться на сервис</Link>
        <a className="btn glass" href="tel:+79679677042">Позвонить</a>
      </div>
    </section>

    <section className="section card searchPanel" style={{marginTop:-24,position:'relative',zIndex:2}}>
      <div className="sectionHead">
        <div>
          <h2>Быстрая проверка детали</h2>
          <p className="muted">Введите артикул или точное название. Если позиция не найдётся, можно сразу отправить запрос менеджеру.</p>
        </div>
      </div>
      <form action="/availability" className="homeSearchForm">
        <input className="input" name="q" placeholder="Например: 28113-1R100 или насос масляный"/>
        <button className="btn primary">Проверить</button>
      </form>
    </section>

    <section className="section">
      <div className="sectionHead"><h2>Что можно сделать на сайте</h2></div>
      <div className="grid">
        <Link className="card" href="/availability"><span className="badge">01</span><h3>Проверить запчасть</h3><p className="muted">По артикулу или названию. Если есть остаток — можно сразу оставить заявку.</p></Link>
        <Link className="card" href="/booking"><span className="badge">02</span><h3>Записаться на сервис</h3><p className="muted">Ремонт, диагностика, ТО, установка купленной детали.</p></Link>
        <Link className="card" href="/parts"><span className="badge">03</span><h3>Открыть каталог</h3><p className="muted">Популярные позиции с быстрым переходом к заявке или проверке наличия.</p></Link>
        <Link className="card" href="/contact"><span className="badge">04</span><h3>Задать вопрос</h3><p className="muted">Контактная заявка напрямую менеджеру.</p></Link>
      </div>
    </section>

    <section className="section">
      <div className="sectionHead"><h2>Популярные услуги</h2><Link className="btn" href="/services">Все услуги</Link></div>
      <div className="grid">{topServices.map(s=><article className="card" key={s.name}><h3>{s.name}</h3><p className="muted">{s.description}</p><p>Срок: <b>{s.time}</b></p><p className="price">{s.price}</p><Link className="btn primary" href="/booking">Записаться</Link></article>)}</div>
    </section>

    <section className="section">
      <div className="sectionHead"><h2>Запчасти для быстрой проверки</h2><Link className="btn" href="/parts">Открыть каталог</Link></div>
      <div className="grid">{topParts.map(p=><article className="card" key={p.sku}><span className="badge">{p.category}</span><h3>{p.name}</h3><p className="muted">{p.sku}</p><p>{p.compatibility}</p><p className="stock">В наличии: {p.stock} шт.</p><p className="price">{p.price}</p><Link className="btn primary" href={`/availability?q=${encodeURIComponent(p.sku)}`}>Проверить наличие</Link></article>)}</div>
    </section>
  </main><Footer/></>
}