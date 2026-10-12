import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'card-busca',
  standalone: false,
  templateUrl: './card-busca.component.html',
  styleUrls: ['./card-busca.component.scss'],
})
export class CardBuscaComponent implements OnInit {
  @Input() maisInfo: any;
  isCollapsed = true;

  ngOnInit(): void {}

  mais(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
