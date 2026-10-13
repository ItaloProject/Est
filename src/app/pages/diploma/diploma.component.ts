import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { XMLParser } from 'fast-xml-parser';
import { BuscaService } from '../../services/busca.service';
import { DadosCurso, DadosIES, DadosRegistro } from '../../models/dados.models';

@Component({
  selector: 'app-diploma',
  standalone: false,
  templateUrl: './diploma.component.html',
  styleUrls: ['./diploma.component.scss'],
})
export class DiplomaComponent implements OnInit {
  @ViewChild('docxContainer') docxContainer: ElementRef<HTMLDivElement>;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private _busca = inject(BuscaService);
  private domSanitizer = inject(DomSanitizer);
  private httpClient = inject(HttpClient);

  user: any;
  pdf: string;
  xmlDownloadLink: SafeResourceUrl;
  pdfDownloadLink: SafeResourceUrl;
  dadosDiplomaOpen = [false, false, false];
  opened = 0;
  codigo = '';
  semXML = false;
  dadosCurso: any = new DadosCurso();
  dadosRegistro: any = new DadosRegistro();
  dadosIES: any = new DadosIES();

  publicacaoEstacio: any = null;
  dadosEstacioOpen = [false, false, false];
  abaAtiva: 'diploma' | 'novo' = 'diploma';
  carregandoDocx = false;
  private readonly MAPY_ID_RE = /^[0-9a-f]{10}$/i;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.codigo = params.get('id');
    });

    if (!this.codigo) {
      this.router.navigate(['']);
      return;
    }

    if (this.MAPY_ID_RE.test(this.codigo)) {
      this._busca.getPublicacaoEstacio(this.codigo).subscribe({
        next: (rows) => {
          if (rows?.length) {
            this.publicacaoEstacio = rows[0];
          } else {
            this.router.navigate(['']);
          }
        },
        error: () => this.router.navigate(['']),
      });
      return;
    }

    const salvo = JSON.parse(sessionStorage.getItem('diplomaDigital'));
    const codSalvo = salvo ? salvo.codValidacaoDiploma : '';

    if ('diplomaDigital' in sessionStorage && codSalvo === this.codigo) {
      this.user = JSON.parse(sessionStorage.getItem('diplomaDigital'));
      if (this.user.codXmlPublico != null) {
        this.ajeitarPdfXml();
        this.lerXML(atob(this.user.codXmlPublico));
      }
      if (this.user.codTipoCurso === 1 || this.user.codTipoCurso === 3 || this.user.codTipoCurso === 45) {
        this.semXML = true;
      }
    } else {
      this._busca.getDiplomaDigital(this.codigo).subscribe((res) => {
        this.user = res;
        if (this.user.codTipoCurso === 1 || this.user.codTipoCurso === 3 || this.user.codTipoCurso === 45) {
          this.semXML = true;
        }
        if (this.user) {
          sessionStorage.setItem('diplomaDigital', JSON.stringify(this.user));
          if (this.user.codXmlPublico != null) {
            this.ajeitarPdfXml();
            this.lerXML(atob(this.user.codXmlPublico));
          }
        } else {
          this.router.navigate(['']);
        }
      });
    }
  }

  open(i: number): void {
    if (this.dadosDiplomaOpen[i]) {
      this.dadosDiplomaOpen[i] = false;
    } else {
      this.dadosDiplomaOpen = [false, false, false];
      this.dadosDiplomaOpen[i] = true;
    }
  }

  openEstacio(i: number): void {
    if (this.dadosEstacioOpen[i]) {
      this.dadosEstacioOpen[i] = false;
    } else {
      this.dadosEstacioOpen = [false, false, false];
      this.dadosEstacioOpen[i] = true;
    }
  }

  async mudarAba(aba: 'diploma' | 'novo'): Promise<void> {
    this.abaAtiva = aba;
    if (aba === 'novo') {
      await this.renderizarDocx();
    }
  }

  private async renderizarDocx(): Promise<void> {
    this.carregandoDocx = true;
    try {
      const [{ default: PizZip }, { default: Docxtemplater }, { renderAsync }] = await Promise.all([
        import('pizzip'),
        import('docxtemplater'),
        import('docx-preview'),
      ]);

      const buffer = await this.httpClient
        .get('assets/templates/CGB.docx', { responseType: 'arraybuffer' })
        .toPromise();

      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      doc.render(this.buildTemplateData());

      const out = doc.getZip().generate({ type: 'arraybuffer' });
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const container = this.docxContainer?.nativeElement;
      if (container) {
        container.innerHTML = '';
        await renderAsync(blob, container);
      }
    } catch (err) {
      console.error('Erro ao renderizar docx:', err);
    } finally {
      this.carregandoDocx = false;
    }
  }

  private buildTemplateData(): Record<string, string> {
    const p = this.publicacaoEstacio || {};
    return {
      nome: p.nome ?? '',
      cpf: p.cpf ?? '',
      nascimento: p.nascimento ?? '',
      municipio: p.municipio ?? '',
      rg: p.rg ?? '',
      orgao_expedidor: p.orgao_expedidor ?? '',
      nome_mae: p.nome_mae ?? '',
      nacionalidade: p.nacionalidade ?? '',
      curso: p.curso ?? '',
      modalidade: p.modalidade ?? '',
      ano_conclusao: p.ano_conclusao ?? '',
      data: p.data ?? '',
      data_colacao: p.data_colacao ?? '',
      instituicao: p.instituicao ?? '',
      inep: p.inep ?? '',
      endereco: p.endereco ?? '',
      bairro: p.bairro ?? '',
      cep: p.cep ?? '',
      protocolo: p.protocolo ?? '',
      reitor: p.reitor ?? '',
      status: p.status ?? '',
      observacao: p.observacao ?? '',
      pub_id: p.pub_id ?? '',
    };
  }

  ajeitarPdfXml(): void {
    const rvdd = this.user.imgRvdd;
    this.pdf = this.getPDF(rvdd);
    this.xmlDownloadLink = this.domSanitizer.bypassSecurityTrustResourceUrl(
      'data:application/octet-stream;base64,' + this.user.codXmlPublico
    );
    this.pdfDownloadLink = this.domSanitizer.bypassSecurityTrustResourceUrl(
      'data:application/octet-stream;base64,' + rvdd
    );
  }

  getPDF(base64: string): string {
    const bytes = new Uint8Array(atob(base64).split('').map((c) => c.charCodeAt(0)));
    const blob = new Blob([bytes], { type: 'data:application/pdf' });
    return URL.createObjectURL(blob);
  }

  lerXML(xml: string): void {
    const texto = decodeURIComponent(escape(xml));
    const parser = new XMLParser({ isArray: () => true, ignoreAttributes: false });
    const resultado = parser.parse(texto);
    this.dadosRegistro = resultado.Diploma[0].infDiploma[0].DadosRegistro[0]?.IesRegistradora[0];
    this.dadosRegistro.LivroRegistro = resultado.Diploma[0].infDiploma[0].DadosRegistro[0].LivroRegistro[0];
    this.dadosCurso = resultado.Diploma[0].infDiploma[0].DadosDiploma[0].DadosCurso[0];
    this.dadosIES = resultado.Diploma[0].infDiploma[0].DadosDiploma[0].IesEmissora[0];
  }

  formataCPF(cpf: number | string): string {
    return String(cpf).padStart(11, '0');
  }
}
