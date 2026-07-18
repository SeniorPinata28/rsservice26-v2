import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
export default function NotFound(){return <><Header/><main className="main"><section className="hero"><span className="badge">404</span><h1>Страница не найдена</h1><p>Возможно, адрес изменился. Вернитесь на главную или проверьте наличие запчасти.</p><div className="heroActions"><Link className="btn primary" href="/">На главную</Link><Link className="btn glass" href="/availability">Проверить запчасть</Link></div></section></main><Footer/></>}
