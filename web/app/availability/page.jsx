import {Suspense} from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import './availability.css';
import AvailabilityClient from './AvailabilityClient';

export default function Page(){return <><Header/><Suspense fallback={<main className="main"><section className="card">Loading...</section></main>}><AvailabilityClient/></Suspense><Footer/></>}
