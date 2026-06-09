import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import CabinetLoginClient from './CabinetLoginClient';

export default function Page(){
  const cabinetEnabled=process.env.NEXT_PUBLIC_CABINET_ENABLED==='true';
  if(!cabinetEnabled){
    return <><Header/><main className="main"><section className="card emptyState"><h1>Кабинет временно недоступен</h1><p className="muted">Вход в кабинет будет включён после подключения production-доставки кода.</p></section></main><Footer/></>
  }
  return <><Header/><main className="main"><CabinetLoginClient/></main><Footer/></>
}
