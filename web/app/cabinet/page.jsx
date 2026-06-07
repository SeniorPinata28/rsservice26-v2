import Header from '../../components/Header';
import Footer from '../../components/Footer';
import CabinetClient from './CabinetClient';

export default function Page(){
  return <><Header/><main className="main"><CabinetClient/></main><Footer/></>
}
