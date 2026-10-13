import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { XMLParser } from 'fast-xml-parser';
import { BuscaService } from '../../services/busca.service';
import { DadosCurso, DadosIES, DadosRegistro } from '../../models/dados.models';

@Component({
  selector: 'app-diploma',
  standalone: false,
  templateUrl: './diploma.component.html',
  styleUrls: ['./diploma.component.scss'],
  preserveWhitespaces: true,
})
export class DiplomaComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private _busca = inject(BuscaService);
  private domSanitizer = inject(DomSanitizer);

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
  docxErro = false;
  docxCarregando = false;
  @ViewChild('docxHost') docxHost?: ElementRef<HTMLDivElement>;
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
            if (this.publicacaoEstacio.docx_url) {
              this.docxCarregando = true;
              setTimeout(() => this.renderizarDocx(), 0);
            }
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

  @HostListener('window:resize')
  ajustarEscalaDocx(): void {
    const host = this.docxHost?.nativeElement;
    const wrapper = host?.querySelector<HTMLElement>('.docx-wrapper');
    const pagina = wrapper?.querySelector<HTMLElement>('section.docx');
    if (!host || !wrapper || !pagina) return;
    wrapper.style.zoom = '1';
    const larguraPagina = pagina.offsetWidth;
    const larguraHost = host.clientWidth;
    wrapper.style.zoom = larguraPagina > larguraHost ? String(larguraHost / larguraPagina) : '1';
  }

  private async renderizarDocx(): Promise<void> {
    const host = this.docxHost?.nativeElement;
    if (!host) {
      this.docxCarregando = false;
      this.docxErro = true;
      return;
    }
    try {
      const resp = await fetch(this.publicacaoEstacio.docx_url, { cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const blob = await resp.blob();
      const { renderAsync } = await import('docx-preview');
      host.innerHTML = '';
      await renderAsync(blob, host, undefined, {
        className: 'docx',
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
      });
      await this.aplicarQrDinamico(host);
      this.docxCarregando = false;
      this.ajustarEscalaDocx();
    } catch (e) {
      console.error('[docx render]', e);
      this.docxCarregando = false;
      this.docxErro = true;
    }
  }

  private async aplicarQrDinamico(host: HTMLElement): Promise<void> {
    const paginas = host.querySelectorAll<HTMLElement>('section.docx');
    const ultima = paginas[paginas.length - 1];
    if (!ultima) return;
    const numero = String(this.publicacaoEstacio.protocolo || this.publicacaoEstacio.pub_id || '');
    const folhas = Array.from(ultima.querySelectorAll<HTMLElement>('p, span'));
    const noNumero = folhas.reverse().find((el) => /^\d{10,}$/.test((el.textContent || '').trim()) && el.children.length === 0);
    if (noNumero && numero) noNumero.textContent = numero;
    const imgs = Array.from(ultima.querySelectorAll<HTMLImageElement>('img'));
    const candidatas = imgs.filter((img) => {
      const w = parseFloat(img.style.width) || img.width;
      const h = parseFloat(img.style.height) || img.height;
      return w > 40 && h > 40 && Math.abs(w - h) / Math.max(w, h) < 0.15;
    });
    const alvo = candidatas.sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!alvo) return;
    const QRCode = (await import('qrcode')).default;
    const url = 'https://est-fawn-sigma.vercel.app/diploma/' + this.publicacaoEstacio.pub_id;
    alvo.src = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 512 });
    alvo.removeAttribute('srcset');
  }

  openEstacio(i: number): void {
    if (this.dadosEstacioOpen[i]) {
      this.dadosEstacioOpen[i] = false;
    } else {
      this.dadosEstacioOpen = [false, false, false];
      this.dadosEstacioOpen[i] = true;
    }
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
