import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'dados',
  standalone: false,
  templateUrl: './dados.component.html',
  styleUrls: ['./dados.component.scss'],
})
export class DadosComponent implements OnInit {
  @Input() dados: any;
  @Input() tipo: string;
  @Input() tipoCurso: number;

  ngOnInit(): void {}
}
