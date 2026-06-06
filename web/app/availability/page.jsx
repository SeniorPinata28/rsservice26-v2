import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './availability.css';
import AvailabilityClient from './AvailabilityClient';

export default function Page({searchParams}){
  const initialQuery=String(searchParams?.q||'').trim();
  return <><Header/><AvailabilityClient initialQuery={initialQuery}/><Footer/></>
}
