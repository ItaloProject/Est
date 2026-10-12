import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sexoEStatus', standalone: false })
export class SexoEStatusPipe implements PipeTransform {
  transform(value: string): string {
    switch (value) {
      case 'F':
        return 'Feminino';
      case 'M':
        return 'Masculino';
      case 'N':
        return 'Ativo';
      case 'S':
        return 'Inativo';
      default:
        return value;
    }
  }
}
