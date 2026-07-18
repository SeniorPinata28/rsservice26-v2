const routes=['','/availability','/parts','/services','/booking','/contact'];
export default function sitemap(){const now=new Date();return routes.map(path=>({url:`https://www.rsservice26.ru${path}`,lastModified:now,changeFrequency:path===''?'weekly':'monthly',priority:path===''?1:.7}))}
