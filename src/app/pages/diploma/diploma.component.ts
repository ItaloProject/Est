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
  private qrAlvo?: HTMLImageElement;
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
    const pagina = host?.querySelector<HTMLElement>('.docx-pagina');
    if (!host || !pagina) return;
    const larguraDoc = Number(pagina.dataset['w']) || 1;
    host.style.setProperty('--s', String(Math.min(1, host.clientWidth / larguraDoc)));
  }

  private montarPaginas(host: HTMLElement): void {
    const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
    const secoes = Array.from(host.querySelectorAll<HTMLElement>('section.docx'));
    if (!wrapper || !secoes.length) return;

    const larg = secoes[0].offsetWidth;
    const alturaMoldura = larg * (590 / 903);
    const paginas: { src: HTMLElement; topo: number; altura: number; clip: number; frente: boolean }[] = [];

    if (secoes.length === 1) {
      const sec = secoes[0];
      const topoSec = sec.getBoundingClientRect().top;
      const ps = Array.from(sec.querySelectorAll<HTMLElement>('p'));
      let idxVal = -1;
      ps.forEach((p, i) => { if ((p.textContent || '').includes('Código de Validação')) idxVal = i; });
      const prox = idxVal >= 0
        ? ps.slice(idxVal + 1).find((p) => (p.textContent || '').trim().length > 0)
        : undefined;

      if (idxVal >= 0 && prox) {
        const fimFrente = ps[idxVal].getBoundingClientRect().bottom - topoSec;
        const inicioVerso = prox.getBoundingClientRect().top - topoSec;
        const anterior = idxVal > 0 ? ps[idxVal - 1] : undefined;
        const temRodape = !!anterior && (anterior.textContent || '').trim().length > 0;
        const topoRodape = (temRodape ? anterior!.getBoundingClientRect().top : ps[idxVal].getBoundingClientRect().top) - topoSec;
        const alturaIdeal = topoRodape / 0.86;
        const alturaFrente = Math.max(fimFrente + 25, Math.min(alturaMoldura, Math.max(alturaMoldura * 0.85, alturaIdeal)));
        paginas.push({ src: sec, topo: 0, altura: alturaFrente, clip: Math.min(alturaFrente, inicioVerso - 4), frente: true });
        const topoVerso = Math.max(0, inicioVerso - 12);
        paginas.push({ src: sec, topo: topoVerso, altura: sec.offsetHeight - topoVerso, clip: sec.offsetHeight - topoVerso, frente: false });
      } else {
        paginas.push({ src: sec, topo: 0, altura: Math.max(alturaMoldura, sec.offsetHeight), clip: sec.offsetHeight, frente: true });
      }
    } else {
      secoes.forEach((sec, i) => {
        paginas.push({ src: sec, topo: 0, altura: sec.offsetHeight, clip: sec.offsetHeight, frente: i === 0 });
      });
    }

    const novas = paginas.map((cfg) => {
      const pagina = document.createElement('div');
      pagina.className = 'docx-pagina' + (cfg.frente ? ' docx-pagina--frente' : '');
      pagina.dataset['w'] = String(larg);
      pagina.style.setProperty('--w', String(larg));
      pagina.style.setProperty('--h', String(cfg.altura));

      const stage = document.createElement('div');
      stage.className = 'docx-stage';
      stage.style.width = larg + 'px';
      stage.style.height = cfg.altura + 'px';

      const clip = document.createElement('div');
      clip.className = 'docx-clip';
      clip.style.height = cfg.clip + 'px';

      const wr = document.createElement('div');
      wr.className = 'docx-wrapper';

      const clone = cfg.src.cloneNode(true) as HTMLElement;
      clone.style.setProperty('margin', '0', 'important');
      clone.style.setProperty('margin-top', -cfg.topo + 'px', 'important');
      clone.style.setProperty('background', 'transparent', 'important');
      clone.style.setProperty('box-shadow', 'none', 'important');

      wr.appendChild(clone);
      clip.appendChild(wr);
      stage.appendChild(clip);
      pagina.appendChild(stage);
      return pagina;
    });

    wrapper.remove();
    novas.forEach((n) => host.appendChild(n));
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
      await this.desenharGruposFlutuantes(blob, host).catch((e) => console.error('[docx grupos]', e));
      this.montarPaginas(host);
      this.docxCarregando = false;
      this.ajustarEscalaDocx();
    } catch (e) {
      console.error('[docx render]', e);
      this.docxCarregando = false;
      this.docxErro = true;
    }
  }

  private async desenharGruposFlutuantes(blob: Blob, host: HTMLElement): Promise<void> {
    const NS = {
      w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
      a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
      pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
      wps: 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
      wpg: 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup',
      r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    };
    const PX = 9525;
    const secao = host.querySelector<HTMLElement>('section.docx');
    if (!secao) return;

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const parser = new DOMParser();
    const docXml = parser.parseFromString(await zip.file('word/document.xml')!.async('string'), 'application/xml');
    const relsFile = zip.file('word/_rels/document.xml.rels');
    const relsXml = relsFile ? parser.parseFromString(await relsFile.async('string'), 'application/xml') : null;
    const rels = new Map<string, string>();
    relsXml?.querySelectorAll('Relationship').forEach((r) => rels.set(r.getAttribute('Id') || '', r.getAttribute('Target') || ''));

    const imagemUrl = async (rid: string): Promise<string | null> => {
      const alvo = rels.get(rid);
      if (!alvo) return null;
      const arq = zip.file('word/' + alvo.replace(/^\//, '').replace(/^word\//, ''));
      if (!arq) return null;
      const bytes = await arq.async('uint8array');
      const tipo = /\.jpe?g$/i.test(alvo) ? 'image/jpeg' : 'image/png';
      return URL.createObjectURL(new Blob([bytes as BlobPart], { type: tipo }));
    };

    const num = (el: Element | null | undefined, attr: string) => Number(el?.getAttribute(attr) || 0);
    const body = docXml.getElementsByTagNameNS(NS.w, 'body')[0];
    const paragrafosDoc = Array.from(body.children).filter((c) => c.localName === 'p');
    const renderizados = Array.from(secao.querySelectorAll<HTMLElement>(':scope > article > p'));
    const topoSecao = secao.getBoundingClientRect().top;
    secao.style.position = 'relative';

    const fonte = renderizados.length
      ? getComputedStyle(renderizados[renderizados.length - 1]).fontFamily
      : 'Arial, sans-serif';

    const criarParagrafo = (p: Element): HTMLElement => {
      const el = document.createElement('div');
      const pPr = p.getElementsByTagNameNS(NS.w, 'pPr')[0];
      const sp = pPr?.getElementsByTagNameNS(NS.w, 'spacing')[0];
      const ind = pPr?.getElementsByTagNameNS(NS.w, 'ind')[0];
      const jc = pPr?.getElementsByTagNameNS(NS.w, 'jc')[0]?.getAttributeNS(NS.w, 'val');
      const spW = (n: string) => sp?.getAttributeNS(NS.w, n);
      el.style.marginTop = Number(spW('before') || 0) / 15 + 'px';
      el.style.marginBottom = Number(spW('after') || 0) / 15 + 'px';
      const line = Number(spW('line') || 0);
      el.style.lineHeight = line && (spW('lineRule') || 'auto') === 'auto' ? String((line / 240) * 1.15) : '1.15';
      const szMarca = pPr?.getElementsByTagNameNS(NS.w, 'sz')[0]?.getAttributeNS(NS.w, 'val');
      const szPrimeiro = p.getElementsByTagNameNS(NS.w, 'r')[0]?.getElementsByTagNameNS(NS.w, 'sz')[0]?.getAttributeNS(NS.w, 'val');
      const szBase = szMarca || szPrimeiro;
      if (szBase) el.style.fontSize = (Number(szBase) / 2) * (96 / 72) + 'px';
      el.style.paddingLeft = Number(ind?.getAttributeNS(NS.w, 'left') || 0) / 15 + 'px';
      el.style.paddingRight = Number(ind?.getAttributeNS(NS.w, 'right') || 0) / 15 + 'px';
      el.style.textIndent = Number(ind?.getAttributeNS(NS.w, 'firstLine') || 0) / 15 + 'px';
      el.style.textAlign = jc === 'center' ? 'center' : jc === 'right' ? 'right' : jc === 'both' ? 'justify' : 'left';
      let temTexto = false;
      Array.from(p.getElementsByTagNameNS(NS.w, 'r')).forEach((r) => {
        const rPr = r.getElementsByTagNameNS(NS.w, 'rPr')[0];
        const t = Array.from(r.getElementsByTagNameNS(NS.w, 't')).map((x) => x.textContent || '').join('');
        const br = r.getElementsByTagNameNS(NS.w, 'br').length > 0;
        if (!t && !br) return;
        const span = document.createElement('span');
        span.textContent = t;
        span.style.whiteSpace = 'pre-wrap';
        const sz = rPr?.getElementsByTagNameNS(NS.w, 'sz')[0]?.getAttributeNS(NS.w, 'val');
        if (sz) span.style.fontSize = (Number(sz) / 2) * (96 / 72) + 'px';
        if (rPr?.getElementsByTagNameNS(NS.w, 'b').length) span.style.fontWeight = '700';
        if (rPr?.getElementsByTagNameNS(NS.w, 'i').length) span.style.fontStyle = 'italic';
        const cor = rPr?.getElementsByTagNameNS(NS.w, 'color')[0]?.getAttributeNS(NS.w, 'val');
        if (cor && cor !== 'auto') span.style.color = '#' + cor;
        el.appendChild(span);
        if (br) el.appendChild(document.createElement('br'));
        if (t.trim()) temTexto = true;
      });
      if (!temTexto) el.style.minHeight = '1.15em';
      return el;
    };

    const ancoras = Array.from(docXml.getElementsByTagNameNS(NS.wp, 'anchor'));
    for (const anc of ancoras) {
      const ext = anc.getElementsByTagNameNS(NS.wp, 'extent')[0];
      const largura = num(ext, 'cx') / PX;
      const altura = num(ext, 'cy') / PX;
      const temGrupo = anc.getElementsByTagNameNS(NS.wpg, 'wgp').length > 0;
      const temCaixa = anc.getElementsByTagNameNS(NS.wps, 'txbx').length > 0;
      if (!temGrupo && !temCaixa) continue;
      if (largura > 900) continue;

      const posH = anc.getElementsByTagNameNS(NS.wp, 'positionH')[0];
      const posV = anc.getElementsByTagNameNS(NS.wp, 'positionV')[0];
      const offH = Number(posH?.getElementsByTagNameNS(NS.wp, 'posOffset')[0]?.textContent || 0) / PX;
      const offV = Number(posV?.getElementsByTagNameNS(NS.wp, 'posOffset')[0]?.textContent || 0) / PX;
      let paraEl: Element | null = anc;
      while (paraEl && !(paraEl.localName === 'p' && paraEl.parentElement === body)) paraEl = paraEl.parentElement;
      const idx = paraEl ? paragrafosDoc.indexOf(paraEl) : -1;
      const ref = idx >= 0 ? renderizados[idx] : undefined;
      if (!ref) {
        console.warn('[docx grupos] parágrafo de ancoragem não encontrado', idx, renderizados.length, paragrafosDoc.length);
        continue;
      }

      const grupo = document.createElement('div');
      grupo.className = 'docx-grupo';
      grupo.style.cssText = 'position:absolute;box-sizing:border-box;color:#000;font-family:' + fonte + ';';
      grupo.style.left = (posH?.getAttribute('relativeFrom') === 'page' ? offH : offH + 28) + 'px';
      grupo.style.top = ref.getBoundingClientRect().top - topoSecao + offV + 'px';
      grupo.style.width = largura + 'px';
      grupo.style.height = altura + 'px';

      const formas = Array.from(anc.getElementsByTagNameNS('*', '*')).filter(
        (e) => (e.namespaceURI === NS.pic && e.localName === 'pic') || (e.namespaceURI === NS.wps && e.localName === 'wsp')
      );
      for (const f of formas) {
        const spPr = Array.from(f.children).find((c) => c.localName === 'spPr');
        const xfrm = spPr?.getElementsByTagNameNS(NS.a, 'xfrm')[0];
        const off = xfrm?.getElementsByTagNameNS(NS.a, 'off')[0];
        const sz = xfrm?.getElementsByTagNameNS(NS.a, 'ext')[0];
        const esq = num(off, 'x') / PX;
        const top = num(off, 'y') / PX;
        const w = sz ? num(sz, 'cx') / PX : largura;
        const h = sz ? num(sz, 'cy') / PX : altura;
        const ln = spPr?.getElementsByTagNameNS(NS.a, 'ln')[0];
        const espessura = ln ? Math.max(1, Math.round((num(ln, 'w') / PX) * 10) / 10) : 0;
        const corLn = '#' + (ln?.getElementsByTagNameNS(NS.a, 'srgbClr')[0]?.getAttribute('val') || '000000');

        const caixa = document.createElement('div');
        caixa.style.cssText = 'position:absolute;box-sizing:border-box;';
        caixa.style.left = esq + 'px';
        caixa.style.top = top + 'px';
        caixa.style.width = w + 'px';

        if (f.localName === 'pic') {
          const rid = f.getElementsByTagNameNS(NS.a, 'blip')[0]?.getAttributeNS(NS.r, 'embed');
          const url = rid ? await imagemUrl(rid) : null;
          if (!url) continue;
          const img = document.createElement('img');
          img.src = url;
          img.style.cssText = 'width:100%;height:100%;display:block;';
          caixa.style.height = h + 'px';
          caixa.appendChild(img);
        } else if (f.getElementsByTagNameNS(NS.w, 'txbxContent').length) {
          caixa.style.height = h + 'px';
          if (ln) caixa.style.border = espessura + 'px solid ' + corLn;
          const conteudo = f.getElementsByTagNameNS(NS.w, 'txbxContent')[0];
          Array.from(conteudo.children)
            .filter((c) => c.localName === 'p')
            .forEach((p) => caixa.appendChild(criarParagrafo(p)));
        } else {
          caixa.style.height = '0px';
          caixa.style.borderTop = espessura + 'px solid ' + corLn;
        }
        grupo.appendChild(caixa);
      }
      secao.appendChild(grupo);
    }

    if (this.qrAlvo) {
      const q = this.qrAlvo;
      const ancQr = ancoras.find((a) => {
        const embed = a.getElementsByTagNameNS(NS.a, 'blip')[0]?.getAttributeNS(NS.r, 'embed');
        const e = a.getElementsByTagNameNS(NS.wp, 'extent')[0];
        return !!embed && !!e && num(e, 'cx') / PX < 200 && a.getElementsByTagNameNS(NS.wps, 'txbx').length === 0;
      });
      if (ancQr) {
        const posH = ancQr.getElementsByTagNameNS(NS.wp, 'positionH')[0];
        const offH = Number(posH?.getElementsByTagNameNS(NS.wp, 'posOffset')[0]?.textContent || 0) / PX;
        const esquerdaAtual = q.getBoundingClientRect().left - secao.getBoundingClientRect().left;
        q.style.position = 'relative';
        q.style.left = offH - esquerdaAtual + 'px';
      }
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
    this.qrAlvo = alvo;
  }

  baixarXmlEstacio(): void {
    const d = this.publicacaoEstacio;
    if (!d) return;
    const esc = (v: unknown) =>
      String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const campos: [string, unknown][] = [
      ['CodigoValidacao', d.pub_id], ['Protocolo', d.protocolo], ['Status', d.ativo ? 'Ativo' : 'Cancelado'],
      ['Nome', d.nome], ['CPF', d.cpf], ['DataNascimento', d.nascimento], ['Nacionalidade', d.nacionalidade],
      ['Naturalidade', d.municipio], ['RG', d.rg], ['OrgaoExpedidor', d.orgao_expedidor],
      ['NomeMae', d.nome_mae], ['NomePai', d.nome_pai],
      ['Curso', d.curso], ['Modalidade', d.modalidade], ['AnoConclusao', d.ano_conclusao],
      ['DataConclusao', d.data], ['DataColacaoGrau', d.data_colacao], ['Reitor', d.reitor],
      ['Instituicao', d.instituicao], ['INEP', d.inep], ['Endereco', d.endereco], ['Bairro', d.bairro], ['CEP', d.cep],
      ['Observacao', d.observacao],
    ];
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n<Diploma>\n' +
      campos.filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `  <${k}>${esc(v)}</${k}>`).join('\n') +
      '\n</Diploma>\n';
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `diploma-${d.pub_id}.xml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
