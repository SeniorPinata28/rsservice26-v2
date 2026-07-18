const imageRules=[
  {pattern:/салон|cabin/i,image:'/parts/cabin-filter.webp'},
  {pattern:/маслян.*фильтр|фильтр.*маслян|oil filter/i,image:'/parts/oil-filter.webp'},
  {pattern:/воздушн.*фильтр|фильтр.*воздушн|air filter/i,image:'/parts/air-filter.webp'},
  {pattern:/топливн.*фильтр|фильтр.*топливн|fuel filter/i,image:'/parts/fuel-filter.webp'},
  {pattern:/колодк|brake pad/i,image:'/parts/brake-pads.webp'},
  {pattern:/тормозн.*диск|диск.*тормозн|brake disc|brake rotor/i,image:'/parts/brake-disc.webp'},
  {pattern:/свеч|spark plug/i,image:'/parts/spark-plug.webp'},
  {pattern:/ремень|drive belt|serpentine/i,image:'/parts/drive-belt.webp'},
  {pattern:/стойк.*стабилиз|стабилиз.*стойк|stabilizer link|sway bar link/i,image:'/parts/stabilizer-link.webp'},
  {pattern:/амортиз|shock absorber|strut/i,image:'/parts/shock-absorber.webp'},
  {pattern:/рычаг|control arm/i,image:'/parts/control-arm.webp'},
  {pattern:/помп|водян.*насос|water pump/i,image:'/parts/water-pump.webp'},
  {pattern:/генератор|alternator/i,image:'/parts/alternator.webp'},
  {pattern:/стартер|starter/i,image:'/parts/starter-motor.webp'},
  {pattern:/осушител|receiver.?drier|кондиционер/i,image:'/parts/ac-receiver-drier.webp'}
]

export function imageForPart(part,query=''){
  const haystack=[part?.name,part?.description,part?.brand,part?.partnumber,query].filter(Boolean).join(' ')
  return imageRules.find(rule=>rule.pattern.test(haystack))?.image||null
}
