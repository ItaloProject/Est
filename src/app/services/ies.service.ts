import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export interface Ies {
  codigo: number;
  name: string;
  path: string;
  identifier: string;
  url: string;
}

@Injectable({ providedIn: 'root' })
export class IesService {
  private document = inject(DOCUMENT);

  private domainList: Ies[] = [
    { codigo: 1, name: 'Estácio', path: 'estacio', identifier: 'localhost', url: 'localhost' },
    { codigo: 1, name: 'Estácio', path: 'estacio', identifier: '.estacio.', url: 'estacio.br' },
    { codigo: 3, name: 'IBMEC', path: 'ibmec', identifier: '.ibmec.', url: 'ibmec.br' },
    { codigo: 4, name: 'Faculdade Damásio', path: 'damasio', identifier: '.damasio.', url: 'faculdadedamasio.com.br' },
    { codigo: 4, name: 'Faculdade Damásio', path: 'damasio', identifier: '.faculdadedamasio.', url: 'faculdadedamasio.com.br' },
    { codigo: 5, name: 'Area 1', path: 'area1', identifier: '.area1.', url: 'area1.br' },
    { codigo: 2, name: 'Unitoledo', path: 'unitoledo', identifier: '.unitoledo.', url: 'unitoledo.br' },
    { codigo: 6, name: 'UniFanor', path: 'unifanor', identifier: '.unifanor.', url: 'unifanor.com.br' },
    { codigo: 7, name: 'UniFBV', path: 'unifbv', identifier: '.unifbv.', url: 'unifbv.com.br' },
    { codigo: 8, name: 'UniFacid', path: 'unifacid', identifier: '.unifacid.', url: 'unifacid.com.br' },
    { codigo: 9, name: 'Faculdade Martha Falcão', path: 'fmf', identifier: '.fmfeducacional.', url: 'fmfeducacional.com.br' },
    { codigo: 10, name: 'Faculdade Faci', path: 'faci', identifier: '.facieducacional.', url: 'facieducacional.com.br' },
    { codigo: 11, name: 'UniMetrocamp', path: 'unimetrocamp', identifier: '.unimetrocamp.', url: 'unimetrocamp.com.br' },
    { codigo: 12, name: 'Facimp', path: 'facimp', identifier: '.facimp.', url: 'facimp.com.br' },
    { codigo: 13, name: 'UniRuy', path: 'uniruy', identifier: '.uniruy.', url: 'uniruy.com.br' },
    { codigo: 14, name: 'UniFavip', path: 'unifavip', identifier: '.unifavip.', url: 'unifavip.com.br' },
    { codigo: 17, name: 'Newton Paiva', path: 'newton', identifier: '.newtonpaiva.', url: 'newtonpaiva.br' },
  ];

  getIES(): Ies {
    let ies = this.domainList.find((d) => this.document.domain.indexOf(d.identifier) > -1);
    if (!ies) {
      ies = this.domainList.find((d) => d.identifier === 'localhost');
    }
    return ies!;
  }

  gatFavicon(path: string): void {
    this.document.getElementById('icon')?.setAttribute('href', `assets/ies/${path}/favicon.png`);
  }
}
