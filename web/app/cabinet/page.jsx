import Header from '../../components/Header';
import Footer from '../../components/Footer';
import CabinetClient from './CabinetClient';

export default function Page(){
  const cabinetEnabled=process.env.NEXT_PUBLIC_CABINET_ENABLED==='true';
  if(!cabinetEnabled){
    return <><Header/><main className="main"><section className="card emptyState"><h1>Кабинет временно недоступен</h1><p className="muted">Доступ будет включён после завершения настройки клиентских учётных записей.</p><div className="cardActions"><a className="btn primary" href="/availability">Проверить запчасть</a><a className="btn" href="/booking">Записаться</a><a className="btn" href="/contact">Задать вопрос</a></div></section></main><Footer/></>
  }
  return <><Header/><main className="main"><CabinetClient/></main><Footer/></>
}
