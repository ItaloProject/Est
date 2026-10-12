import { Component, OnInit, inject } from '@angular/core';
import { IesService } from './services/ies.service';

@Component({
  selector: 'app-root',
  standalone: false,
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  private document = inject(IesService);
  ies = this.document.getIES();

  ngOnInit(): void {
    sessionStorage.setItem('ies', JSON.stringify(this.ies));
  }
}
