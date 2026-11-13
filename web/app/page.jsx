import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import {services,parts} from '../data';

export default function Home(){
  const featuredServices=[services[0],services[3],services[6],services[10],services[12],services[13]];
  const icons=['M3 4h18v12H3z M8 20h8 M12 16v4 M6 11h3l2-4 3 7 2-3h2','M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z M9 15a3 3 0 0 0 3 3','M3 9h3l3-4h8v4h4v10H5v-4H3z M10 5V2 M7 2h6 M12 10l-2 4h4l-2 4','M8 3h8 M8 21h8 M12 3v3 M12 18v3 M8 6l8 3-8 3 8 3-8 3','M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 3v2 M3 12h2 M19 12h2 M12 19v2','M13 2 5 14h6l-1 8 9-13h-7z'];
  const topParts=parts.slice(0,3);
  return <><Header/><main className="homePage">
    <section className="homeHero">
      <div className="homeHeroOverlay">
        <div className="homeHeroText">
          <span className="eyebrow"><i/> СТАВРОПОЛЬ · ПЯТИГОРСК</span>
          <h1>Ваш автомобиль.<br/>Наше <em>дело.</em></h1><div className="heroSpecialty">Сервис и запчасти Hyundai & Kia</div>
          <p>Диагностика, обслуживание и ремонт.<br/>От подбора детали до готового автомобиля.</p><div className="heroActions"><Link className="btn primary" href="/booking">Записаться на сервис <span>→</span></Link><Link className="heroSecondary" href="/services">Услуги и цены <span>→</span></Link></div>
        </div>
        <div className="heroSpacer" aria-hidden="true"/>
        <form action="/availability" className="heroSearch">
          <div className="searchTabs"><span className="active">Артикул</span><span>VIN</span><span>Название детали</span></div>
          <div className="heroSearchRow"><input className="input" name="q" required placeholder="Введите артикул или точное название"/><button className="btn primary">Проверить наличие</button></div>
          <small>Если запрос общий, на следующем шаге можно уточнить автомобиль и нужную деталь.</small>
        </form>
      </div>
    </section>

    <section className="cityStrip pageShell" aria-label="Адреса автосервисов">
      {[['Ставрополь','просп. Кулакова, 18Д','+7 (962) 453-72-97','+79624537297'],['Пятигорск','ул. Фабричная, 32','+7 (934) 041-60-60','+79340416060']].map(([city,address,phone,tel])=><div className="cityItem" key={city}><span className="locationIcon">→</span><Link href="/contact"><b>{city}</b><span>{address}</span></Link><a className="cityPhone" href={`tel:${tel}`}>{phone}</a></div>)}
    </section>
    <section className="signatureServices pageShell"><div className="signatureHeading"><div><span className="eyebrow">ТОЧНОСТЬ В КАЖДОЙ ДЕТАЛИ</span><h2>Сервис, которому<br/>доверяют автомобиль<span>.</span></h2></div><Link className="heroSecondary" href="/services">Все услуги и цены <span>→</span></Link></div><div className="signatureGrid">{featuredServices.map((service,i)=><Link href="/services" className="signatureCard" key={service.name}><div className="serviceArt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[i]}/></svg><span className="serviceNumber">0{i+1}</span></div><h3>{service.name}</h3><p>{service.description}</p><div className="serviceCardBottom"><b>{service.price}</b><span aria-hidden="true">→</span></div></Link>)}</div></section>

    <div className="homeColumns pageShell">
      <div>
        <section className="homeSection"><div className="sectionHead"><div><h2>Популярные запчасти</h2><p className="muted">Цена и наличие подтверждаются перед заказом</p></div><Link className="textLink" href="/parts">Весь каталог →</Link></div><div className="featuredParts">{topParts.map(p=><article className="darkProduct" key={p.sku}><span className="stockBadge">В наличии</span><div className="productVisual"><Image src={p.image} alt={p.name} width={320} height={220} sizes="(max-width: 640px) 80vw, 260px"/></div><h3>{p.name}</h3><small>{p.sku}</small><p>{p.compatibility}</p><div className="productBottom"><b>{p.price}</b><span>{p.stock} шт.</span></div><Link className="btn primary" href={`/availability?q=${encodeURIComponent(p.sku)}`}>Уточнить наличие</Link></article>)}</div></section>
        <section className="bookingBanner"><div><h2>Запишитесь на сервис</h2><p>Выберите удобное время — менеджер подтвердит запись</p></div><Link className="btn primary" href="/booking">Записаться</Link></section>
      </div>
      <aside className="homeAside"><section className="partsHelp"><span className="eyebrow">ПОДБОР БЕЗ ОШИБОК</span><h2>Не знаете <br/>артикул детали?</h2><p>Оставьте VIN и описание — менеджер проверит совместимость, наличие и стоимость.</p><Link className="btn" href="/contact">Помочь с подбором →</Link><div className="partsHelpNote">Оригинальные детали<br/>и проверенные аналоги</div></section></aside>
    </div>

    <section className="bottomCta"><div><b>Нужна запчасть или ремонт?</b><span>Оставьте заявку — менеджер ответит и подтвердит детали.</span></div><div><Link className="btn primary" href="/availability">Проверить запчасть</Link><Link className="btn glass" href="/booking">Записаться</Link></div></section>
  </main><Footer/></>
}