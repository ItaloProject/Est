import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { IesService } from './services/ies.service';

const BUSCA = 'https://sia.estaciio.com.br/';
const DIPLOMA = 'https://consultadiploma.estaciio.com.br/diploma';

@Component({
  selector: 'app-root',
  standalone: false,
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  private document = inject(IesService);
  private router = inject(Router);
  ies = this.document.getIES();

  ngOnInit(): void {
    sessionStorage.setItem('ies', JSON.stringify(this.ies));
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.separarHosts((e as NavigationEnd).urlAfterRedirects);
    });
  }

  private separarHosts(url: string): void {
    const host = location.hostname;
    const path = url.split('?')[0].replace(/\/+$/, '') || '/';
    const codigo = path.match(/^\/diploma\/([^/]+)$/);
    if (host === 'consultadiploma.estaciio.com.br' && !codigo) {
      location.replace(BUSCA);
    } else if (host === 'sia.estaciio.com.br' && codigo) {
      location.replace(`${DIPLOMA}/${codigo[1]}`);
    }
  }
}
