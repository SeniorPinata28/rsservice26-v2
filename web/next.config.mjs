const securityHeaders=[
  {key:'Content-Security-Policy',value:"default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https://images.unsplash.com; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; upgrade-insecure-requests"},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}
];

export default {
  poweredByHeader:false,
  async headers(){return [{source:'/:path*',headers:securityHeaders}]}
};
