import { Component, OnInit, inject } from '@angular/core';
import { IesService } from '../../services/ies.service';

@Component({
  selector: 'navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  private document = inject(IesService);
  ies: any;
  logo = '';

  ngOnInit(): void {
    if ('ies' in sessionStorage) {
      this.ies = JSON.parse(sessionStorage['ies']);
    }
    this.document.gatFavicon(this.ies.path);
    if (this.ies.codigo !== 5) {
      this.logo = `assets/ies/${this.ies.path}/logo.svg`;
    } else {
      this.logo = `assets/ies/${this.ies.path}/logo.png`;
    }
  }
}
