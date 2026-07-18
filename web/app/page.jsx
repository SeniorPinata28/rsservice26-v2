import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import {services,parts} from '../data';

export default function Home(){
  const topServices=services.slice(0,8);
  const topParts=parts.slice(0,3);
  return <><Header/><main className="homePage">
    <section className="homeHero">
      <div className="homeHeroOverlay">
        <div className="homeHeroText">
          <span className="eyebrow">Hyundai & Kia · Ставрополь</span>
          <h1>Проверьте наличие<br/>запчастей <em>Hyundai</em> и <strong>Kia</strong><br/>за 15 секунд</h1>
          <p>Оригинальные детали и проверенные аналоги<br/>с актуальными ценами и сроками поставки</p>
        </div>
        <div className="heroSpacer" aria-hidden="true"/>
        <form action="/availability" className="heroSearch">
          <div className="searchTabs"><span className="active">Артикул</span><span>VIN</span><span>Название детали</span></div>
          <div className="heroSearchRow"><input className="input" name="q" required placeholder="Введите артикул или название детали"/><button className="btn primary">Проверить наличие</button></div>
          <small>Примеры: 26300-35503, 28113-1R100, 97133-D1000</small>
        </form>
      </div>
    </section>

    <section className="trustBar pageShell">{[
      ['◇','Гарантия','на все запчасти и работы'],['✺','Оригинальные запчасти','и качественные аналоги'],['▱','Быстрая доставка','по Ставрополю и России'],['▣','Честная стоимость','подтверждает менеджер'],['♧','Опытные мастера','Hyundai и Kia']
    ].map(([icon,title,text])=><div key={title}><i>{icon}</i><span><b>{title}</b><small>{text}</small></span></div>)}</section>

    <div className="homeColumns pageShell">
      <div>
        <section className="homeSection"><div className="sectionHead"><div><h2>Популярные запчасти</h2><p className="muted">Проверка цены и остатков в реальном времени</p></div><Link className="textLink" href="/parts">Весь каталог →</Link></div><div className="featuredParts">{topParts.map(p=><article className="darkProduct" key={p.sku}><span className="stockBadge">В наличии</span><div className="productVisual">{p.category.slice(0,1)}</div><h3>{p.name}</h3><small>{p.sku}</small><p>{p.compatibility}</p><div className="productBottom"><b>{p.price}</b><span>{p.stock} шт.</span></div><Link className="btn primary" href={`/availability?q=${encodeURIComponent(p.sku)}`}>Проверить</Link></article>)}</div></section>
        <section className="bookingBanner"><div><h2>Запишитесь на сервис</h2><p>Выберите удобное время — менеджер подтвердит запись</p></div><Link className="btn primary" href="/booking">Записаться</Link></section>
      </div>
      <aside className="homeAside"><section className="darkPanel"><div className="sectionHead"><h2>Стандартные работы</h2><Link className="textLink" href="/services">Весь прайс</Link></div>{topServices.map(s=><div className="priceRow" key={s.name}><span>{s.name}</span><i/><b>{s.price}</b></div>)}<Link className="panelLink" href="/services">Показать все услуги</Link></section><section className="helpPanel"><div><b>Нужна помощь?</b><p>Менеджер подберёт запчасти и рассчитает стоимость работ</p></div><Link className="btn" href="/contact">Связаться</Link></section></aside>
    </div>

    <section className="processSection pageShell" id="about"><div className="sectionHead"><h2>Как мы работаем</h2><span className="badge">Без лишних действий</span></div><div className="processGrid">{[['01','Оставляете запрос','Артикул, VIN или описание проблемы'],['02','Проверяем и считаем','Наличие, аналоги, работы и точный срок'],['03','Подтверждаем с вами','Менеджер согласует итоговую стоимость'],['04','Выдаём с гарантией','Запчасть или готовый автомобиль']].map(([n,t,d])=><article key={n}><b>{n}</b><div><h3>{t}</h3><p>{d}</p></div></article>)}</div></section>
    <section className="statsBar pageShell" id="offers">{[['8+','лет на рынке'],['5000+','довольных клиентов'],['20+','специалистов в команде'],['100%','гарантия на работы']].map(([n,t])=><div key={n}><b>{n}</b><span>{t}</span></div>)}</section>
    <section className="bottomCta"><div><b>Нужна запчасть или ремонт?</b><span>Оставьте заявку — менеджер ответит и подтвердит детали.</span></div><div><Link className="btn primary" href="/availability">Проверить запчасть</Link><Link className="btn glass" href="/booking">Записаться</Link></div></section>
  </main><Footer/></>
}
