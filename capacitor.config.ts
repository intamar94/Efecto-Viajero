import type { CapacitorConfig } from "@capacitor/cli";

// Efecto Viajero sigue siendo la app web de siempre (rutas de servidor
// incluidas: /api/*, todas las llamadas a Wikivoyage/OSM/Nominatim desde
// el navegador). En vez de reescribirla como una exportación estática
// (que rompería las rutas de servidor), Capacitor carga el sitio real ya
// desplegado en Vercel dentro de un WebView nativo — el mismo patrón que
// usan apps grandes para no duplicar su web. Lo que gana la app nativa no
// es "otro sitio": es acceso real a permisos del sistema operativo
// (galería completa, calendario nativo, GPS en segundo plano) que el
// navegador nunca concede, puenteados hacia esta misma interfaz.
const config: CapacitorConfig = {
  appId: "com.efectoviajero.app",
  appName: "Efecto Viajero",
  webDir: "public",
  server: {
    url: "https://efecto-viajero.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
