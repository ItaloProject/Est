import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BuscaService {
  private http = inject(HttpClient);
  private baseURL = environment.url;
  private headers = new HttpHeaders({ apikey: environment.apptoken });

  getInstituicao(codGrupoMarca: number) {
    return this.http.get<any>(`${this.baseURL}/instituicao-ensino`, {
      headers: this.headers,
      params: { codGrupoMarca },
    });
  }

  getResultado(body: any, pageSize: number, pageNumber: number) {
    return this.http.post<any>(`${this.baseURL}/livro-registro-diploma`, body, {
      headers: this.headers,
      params: { page_size: pageSize, page_number: pageNumber },
    });
  }

  getDiplomaDigital(codValidacaoDiploma: string) {
    return this.http.get<any>(`${this.baseURL}/diploma-digital`, {
      headers: this.headers,
      params: { codValidacaoDiploma },
    });
  }
}
