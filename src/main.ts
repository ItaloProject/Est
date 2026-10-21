import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';

const BUSCA = 'https://sia.estaciio.com.br/';
const DIPLOMA = 'https://consultadiploma.estaciio.com.br/diploma';
const host = location.hostname;
const path = location.pathname.replace(/\/+$/, '') || '/';
const codigo = path.match(/^\/diploma\/([^/]+)$/);

if (host === 'consultadiploma.estaciio.com.br' && !codigo) {
  location.replace(BUSCA);
} else if (host === 'sia.estaciio.com.br' && codigo) {
  location.replace(`${DIPLOMA}/${codigo[1]}${location.search}`);
} else {
  platformBrowser()
    .bootstrapModule(AppModule)
    .catch((err) => console.error(err));
}
