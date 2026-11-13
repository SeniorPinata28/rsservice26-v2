import './globals.css'
import './design-system.css'
import './brand-refinement.css'
export const metadata={
  metadataBase:new URL('https://www.rsservice26.ru'),
  title:{default:'RSService26 — мультибрендовый автосервис в Ставрополе и Пятигорске',template:'%s | RSService26'},
  description:'Запчасти, диагностика и ремонт автомобилей разных марок в Ставрополе и Пятигорске. Проверка наличия по артикулу или VIN, запись на сервис и гарантия на работы.',
  alternates:{canonical:'/'},
  openGraph:{type:'website',locale:'ru_RU',url:'/',siteName:'RSService26',title:'RSService26 — мультибрендовый автосервис',description:'Запчасти, диагностика и ремонт автомобилей разных марок в Ставрополе и Пятигорске.',images:[{url:'/brand/multibrand-hero.webp',width:1536,height:1024,alt:'RSService26 — мультибрендовый автосервис'}]},
  twitter:{card:'summary_large_image',title:'RSService26 — мультибрендовый автосервис',description:'Запчасти, диагностика и ремонт автомобилей разных марок в Ставрополе и Пятигорске.',images:['/brand/multibrand-hero.webp']},
  robots:{index:true,follow:true},
  icons:{icon:'/brand/rs-chrome-logo.webp'}
}
export default function RootLayout({children}){return <html lang="ru"><body>{children}</body></html>}
