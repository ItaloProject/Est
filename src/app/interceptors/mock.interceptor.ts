import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

const MOCK_DIPLOMA = {
  codValidacaoDiploma: '1270.163.c792736cf907',
  nomeAluno: 'PAULO VICTOR SECOMANDI',
  cpfAluno: '12345678901',
  dataNascimento: '1995-06-15T00:00:00',
  naturalidade: 'São Paulo/SP',
  numIdentidade: '12.345.678-9',
  sexo: 'M',
  diplomaDigitalCancelado: 'N',
  codTipoCurso: 2,
  codXmlPublico: null,
  imgRvdd: null,
};

const MOCK_INSTITUICOES = {
  listarTodasInstituicoesEnsinoResult: {
    instituicaoEnsinoDTO: [
      { codInstituicao: 1, nome: 'Estácio de Sá - Rio de Janeiro' },
      { codInstituicao: 2, nome: 'Estácio de Sá - São Paulo' },
      { codInstituicao: 3, nome: 'Estácio de Sá - Belo Horizonte' },
    ],
  },
};

const MOCK_RESULTADO = {
  totalRegistros: 1,
  registros: [
    {
      nomeAluno: 'PAULO VICTOR SECOMANDI',
      cpfAluno: '12345678901',
      nomeCursoEMEC: 'Engenharia de Software',
      nomeInstituicaoExpedidoraEMEC: 'Estácio de Sá',
      nomeInstituicaoRegistraEMEC: 'Estácio de Sá',
      dataIngressoCurso: '01/02/2018',
      dataConclusaoCurso: '15/12/2022',
      dataExpedicaoDiploma: '10/03/2023',
      dataRegistroDiploma: '15/03/2023',
      numRegistroDiplomaSIA: '2023-0001',
      dataRegistroDOU: '20/03/2023',
      codValidacaoDiploma: '1270.163.c792736cf907',
    },
  ],
};

@Injectable()
export class MockInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!req.url.includes('azurewebsites.net')) {
      return next.handle(req);
    }

    if (req.url.includes('/diploma-digital')) {
      return of(new HttpResponse({ status: 200, body: MOCK_DIPLOMA })).pipe(delay(800));
    }

    if (req.url.includes('/instituicao-ensino')) {
      return of(new HttpResponse({ status: 200, body: MOCK_INSTITUICOES })).pipe(delay(500));
    }

    if (req.url.includes('/livro-registro-diploma')) {
      return of(new HttpResponse({ status: 200, body: MOCK_RESULTADO })).pipe(delay(800));
    }

    return next.handle(req);
  }
}
