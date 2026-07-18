import './globals.css'
import './ux.css'
import './design-system.css'
export const metadata={
  metadataBase:new URL('https://www.rsservice26.ru'),
  title:{default:'RSService26 — сервис Hyundai и Kia в Ставрополе',template:'%s | RSService26'},
  description:'Запчасти, диагностика и ремонт Hyundai и Kia в Ставрополе. Проверка наличия по артикулу или VIN, запись на сервис и гарантия на работы.',
  alternates:{canonical:'/'},
  openGraph:{type:'website',locale:'ru_RU',url:'/',siteName:'RSService26',title:'RSService26 — сервис Hyundai и Kia',description:'Запчасти, диагностика и ремонт Hyundai и Kia в Ставрополе.',images:[{url:'/brand/hero-background.webp',width:1536,height:1024,alt:'RSService26 — Hyundai и Kia'}]},
  twitter:{card:'summary_large_image',title:'RSService26 — сервис Hyundai и Kia',description:'Запчасти, диагностика и ремонт Hyundai и Kia в Ставрополе.',images:['/brand/hero-background.webp']},
  robots:{index:true,follow:true},
  icons:{icon:'/brand/rs-logo.webp'}
}
export default function RootLayout({children}){return <html lang="ru"><body>{children}</body></html>}
