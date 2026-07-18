import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import CabinetLoginClient from './CabinetLoginClient';

export default function Page(){
  const cabinetEnabled=true;
  if(!cabinetEnabled){
    return <><Header/><main className="main"><section className="card emptyState"><h1>Кабинет временно недоступен</h1><p className="muted">Доступ будет включён после завершения настройки клиентских учётных записей.</p></section></main><Footer/></>
  }
  return <><Header/><main className="main"><CabinetLoginClient/></main><Footer/></>
}
