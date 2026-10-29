import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { XMLParser } from 'fast-xml-parser';
import { BuscaService } from '../../services/busca.service';
import { CURSO_PADRAO, codigoConsulta, montarXmlDiploma, painelCurso, painelIes, painelRegistro } from '../../services/xml-diploma';
import { DadosCurso, DadosIES, DadosRegistro } from '../../models/dados.models';
import { environment } from '../../../environments/environment';

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

  diplomaUrl = environment.diplomaUrl;
  conformidadeUrl = environment.conformidadeUrl;
  publicacaoEstacio: any = null;

  // Endereço que vai no QR e no rodapé: o link curto do Encurtador (se existir), senão o endereço direto do diploma.
  get enderecoDiploma(): string {
    const p = this.publicacaoEstacio;
    return p?.url_curta || `${this.diplomaUrl}/${p?.pub_id}`;
  }

  dadosEstacioOpen = [false, false, false];
  docxErro = false;
  docxCarregando = false;
  gerandoPdf = false;
  private qrAlvo?: HTMLImageElement;
  @ViewChild('docxHost') docxHost?: ElementRef<HTMLDivElement>;
  private readonly MAPY_ID_RE = /^[0-9a-f]{10}$/i;
  static readonly CODIGO_VALIDACAO_RE = /^\d{4}\.\d{3}\.[0-9a-f]{12}$/i;
  // (hhea ascender + descender + lineGap) / unitsPerEm dos .ttf do Windows: é a altura da entrelinha simples no Word.
  private static readonly ALTURA_LINHA_FONTE: Record<string, number> = {
    arial: 1.1499,
    'microsoft sans serif': 1.1318,
    'times new roman': 1.1499,
    calibri: 1.2207,
  };

  private alturaLinha(fonte: string | null | undefined): number {
    const nome = (fonte || '').split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
    return DiplomaComponent.ALTURA_LINHA_FONTE[nome] ?? 1.15;
  }

  sexoEstacio(): string {
    const pub = this.publicacaoEstacio;
    if (!pub) return '';
    let bruto = String(pub.sexo || '');
    if (!bruto && typeof pub.inep === 'string' && pub.inep.trim().startsWith('{')) {
      try { bruto = JSON.parse(pub.inep).sexo || ''; } catch { bruto = ''; }
    }
    const n = bruto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (n === 'M' || n.startsWith('MASC')) return 'Masculino';
    if (n === 'F' || n.startsWith('FEM')) return 'Feminino';
    return bruto;
  }

  private montarDadosIES(pub: Record<string, unknown>) {
    const e = painelIes(pub);
    const ato = e.credenciamento;
    const campo = (valor: unknown) => [String(valor)];
    const endereco = {
      Logradouro: campo(e.logradouro),
      Numero: campo(e.numero),
      Bairro: campo(e.bairro),
      CEP: campo(e.cep),
      NomeMunicipio: campo(e.municipio),
      CodigoMunicipio: campo(e.codigoMunicipio),
      UF: campo(e.uf),
    };
    return {
      Nome: campo(e.nome),
      CodigoMEC: campo(e.codigo),
      CNPJ: campo(e.cnpj),
      Endereco: [endereco],
      Credenciamento: [{
        Tipo: campo(ato.tipo),
        Numero: campo(ato.numero),
        Data: campo(ato.data),
        DataPublicacao: campo(ato.publicacao),
        SecaoPublicacao: campo(ato.secao),
        PaginaPublicacao: campo(ato.pagina),
      }],
      Mantenedora: [{
        RazaoSocial: campo(e.mantenedora),
        CNPJ: campo(e.cnpj),
        Endereco: [endereco],
      }],
    };
  }

  private montarDadosCurso(pub: Record<string, unknown>) {
    const c = painelCurso(pub);
    const campo = (valor: unknown) => [valor == null || valor === '' ? '' : String(valor)];
    const modalidade = String(pub['modalidade'] || '');
    return {
      NomeCurso: campo(c.nome || pub['curso']),
      CodigoCursoEMEC: campo(c.codigo),
      TituloConferido: [{ OutroTitulo: campo(c.titulo || this.tituloConferido(modalidade)) }],
      GrauConferido: campo(c.grau || this.grauConferido(modalidade)),
      EnderecoCurso: [{
        Logradouro: campo(c.logradouro),
        Numero: campo(c.numero),
        Bairro: campo(c.bairro),
        CEP: campo(c.cep),
        NomeMunicipio: campo(c.municipio),
        CodigoMunicipio: campo(c.codigoMunicipio),
        UF: campo(c.uf),
      }],
      Autorizacao: [{
        Tipo: campo(c.autorizacao.tipo),
        Numero: campo(c.autorizacao.numero),
        Data: campo(c.autorizacao.data),
      }],
      Reconhecimento: [{
        Tipo: campo(c.reconhecimento.tipo),
        Numero: campo(c.reconhecimento.numero),
        Data: campo(c.reconhecimento.data),
      }],
    };
  }

  private tituloConferido(modalidade: string): string {
    const n = modalidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (!n || n.startsWith('TECNOLOG')) return CURSO_PADRAO.titulo;
    if (n.startsWith('BACHAREL')) return 'BACHAREL';
    if (n.startsWith('LICEN')) return 'LICENCIADO (A)';
    if (n.startsWith('ESPECIAL')) return 'ESPECIALISTA';
    if (n.startsWith('MESTRE')) return 'MESTRE';
    if (n.startsWith('DOUTOR')) return 'DOUTOR (A)';
    return modalidade;
  }

  private grauConferido(modalidade: string): string {
    const n = modalidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (!n || n.startsWith('TECNOLOG')) return CURSO_PADRAO.grau;
    if (n.startsWith('BACHAREL')) return 'Bacharelado';
    if (n.startsWith('LICEN')) return 'Licenciatura';
    return modalidade;
  }

  private montarDadosRegistro(pub: Record<string, unknown>) {
    const r = painelRegistro(pub);
    const ato = r.credenciamento;
    const campo = (valor: unknown) => [valor == null || valor === '' ? '' : String(valor)];
    const iso = (valor: unknown) => {
      const texto = String(valor || '').trim();
      const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
      return br ? `${br[3]}-${br[2]}-${br[1]}` : texto;
    };
    return {
      Nome: campo(r.nome),
      CodigoMEC: campo(r.codigo),
      CNPJ: campo(r.cnpj),
      Endereco: [{
        Logradouro: campo(r.logradouro),
        Numero: campo(r.numero),
        Bairro: campo(r.bairro),
        CEP: campo(r.cep),
        NomeMunicipio: campo(r.municipio),
        CodigoMunicipio: campo(r.codigoMunicipio),
        UF: campo(r.uf),
      }],
      Credenciamento: [{
        Tipo: campo(ato.tipo),
        Numero: campo(ato.numero),
        Data: campo(ato.data),
        DataPublicacao: campo(ato.publicacao),
        SecaoPublicacao: campo(ato.secao),
        PaginaPublicacao: campo(ato.pagina),
      }],
      Mantenedora: [{
        RazaoSocial: campo(r.mantenedora),
        CNPJ: campo(r.cnpj),
        Endereco: [{
          Logradouro: campo(r.mantenedoraLogradouro),
          Numero: campo(r.mantenedoraNumero),
          Bairro: campo(r.mantenedoraBairro),
          CEP: campo(r.mantenedoraCep),
          NomeMunicipio: campo(r.municipio),
          CodigoMunicipio: campo(r.codigoMunicipio),
          UF: campo(r.uf),
        }],
      }],
      LivroRegistro: {
        LivroRegistro: campo(pub['registro_livro'] || '1'),
        NumeroFolhaDoDiploma: campo(pub['registro_folha'] || '13193'),
        NumeroSequenciaDoDiploma: campo(pub['registro_numero']),
        ProcessoDoDiploma: campo(pub['registro_processo']),
        DataColacaoGrau: campo(iso(pub['data_colacao'])),
        DataExpedicaoDiploma: campo(iso(pub['data_expedicao'])),
        DataRegistroDiploma: campo(iso(pub['registro_data'])),
      },
    };
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const bruto = params.get('id') || '';
      this.codigo = codigoConsulta(bruto) || bruto;
    });

    if (!this.codigo) {
      this.irParaBusca();
      return;
    }

    const soMapy = this.MAPY_ID_RE.test(this.codigo);
    if (soMapy || DiplomaComponent.CODIGO_VALIDACAO_RE.test(this.codigo)) {
      const naoEncontrado = () => (soMapy ? this.irParaBusca() : this.carregarDiplomaDigital());
      const tentar = (id: string, extra: boolean) => {
        this._busca.getPublicacaoEstacio(id).subscribe({
          next: (rows) => {
            if (rows?.length) {
              this.publicacaoEstacio = rows[0];
              this.dadosIES = this.montarDadosIES(rows[0]);
              this.dadosCurso = this.montarDadosCurso(rows[0]);
              this.dadosRegistro = this.montarDadosRegistro(rows[0]);
              if (this.publicacaoEstacio.docx_url) {
                this.docxCarregando = true;
                setTimeout(() => this.renderizarDocx(), 0);
              }
              return;
            }
            const curto = extra ? /^1270\.163\.00([0-9a-f]{10})$/i.exec(id)?.[1] : null;
            if (curto) {
              tentar(curto, false);
              return;
            }
            naoEncontrado();
          },
          error: () => naoEncontrado(),
        });
      };
      tentar(this.codigo, true);
      return;
    }

    this.carregarDiplomaDigital();
  }

  private carregarDiplomaDigital(): void {
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
          this.irParaBusca();
        }
      });
    }
  }

  private irParaBusca(): void {
    if (location.hostname.endsWith('estaciio.com.br')) {
      location.assign('https://sia.estaciio.com.br/');
      return;
    }
    this.router.navigate(['']);
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
    const alturaPaginaPt = parseFloat(secoes[0].style.minHeight);
    const alturaMoldura = alturaPaginaPt ? alturaPaginaPt * (96 / 72) : larg * (590 / 903);
    const paginas: { src: HTMLElement; topo: number; altura: number; clip: number; frente: boolean }[] = [];

    const inicios = secoes.length === 1
      ? Array.from(secoes[0].querySelectorAll<HTMLElement>(':scope > article[data-pagina-inicio]'))
          .map((a) => Number(a.dataset['paginaInicio']))
      : [];

    if (inicios.length) {
      const sec = secoes[0];
      const limites = [0, ...inicios, Math.max(sec.offsetHeight, inicios[inicios.length - 1] + alturaMoldura)];
      for (let i = 0; i < limites.length - 1; i++) {
        const altura = Math.max(alturaMoldura, limites[i + 1] - limites[i]);
        paginas.push({ src: sec, topo: limites[i], altura, clip: limites[i + 1] - limites[i], frente: i === 0 });
      }
    } else if (secoes.length === 1) {
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
        const alturaFrente = Math.max(alturaMoldura, fimFrente);
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
      await this.aplicarTipografiaWord(blob, host).catch((e) => console.error('[docx tipografia]', e));
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

  private async aplicarTipografiaWord(blob: Blob, host: HTMLElement): Promise<void> {
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const secao = host.querySelector<HTMLElement>('section.docx');
    if (!secao) return;

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const parser = new DOMParser();
    const docXml = parser.parseFromString(await zip.file('word/document.xml')!.async('string'), 'application/xml');
    const stylesTxt = await zip.file('word/styles.xml')?.async('string');
    const stylesXml = stylesTxt ? parser.parseFromString(stylesTxt, 'application/xml') : null;

    const filho = (el: Element | null | undefined, nome: string): Element | null =>
      (el && Array.from(el.children).find((c) => c.localName === nome)) || null;
    const attr = (el: Element | null | undefined, nome = 'val'): string | null => el?.getAttributeNS(W, nome) ?? null;

    const estilos = new Map<string, Element>();
    let estiloPadrao = 'Normal';
    Array.from(stylesXml?.getElementsByTagNameNS(W, 'style') ?? []).forEach((s) => {
      const id = attr(s, 'styleId');
      if (!id) return;
      estilos.set(id, s);
      if (attr(s, 'type') === 'paragraph' && attr(s, 'default') === '1') estiloPadrao = id;
    });
    const rPrPadrao = filho(filho(stylesXml?.getElementsByTagNameNS(W, 'rPrDefault')[0], 'rPr'), 'sz');
    const szPadrao = Number(attr(rPrPadrao) || 22);

    const ligado = (el: Element | null): boolean | null => {
      if (!el) return null;
      const v = attr(el);
      return v === null || !['0', 'false', 'off'].includes(v);
    };

    const doEstilo = (id: string | null, prop: 'rFonts' | 'sz' | 'b'): string | null => {
      const vistos = new Set<Element>();
      let s = id ? estilos.get(id) : undefined;
      while (s && !vistos.has(s)) {
        vistos.add(s);
        const el = filho(filho(s, 'rPr'), prop);
        const v = prop === 'rFonts' ? attr(el, 'ascii') : prop === 'b' ? (el ? String(ligado(el)) : null) : attr(el);
        if (v) return v;
        const base = attr(filho(s, 'basedOn'));
        s = base ? estilos.get(base) : undefined;
      }
      return null;
    };

    const body = docXml.getElementsByTagNameNS(W, 'body')[0];
    const larguraPagina = Number(docXml.getElementsByTagNameNS(W, 'pgSz')[0]?.getAttributeNS(W, 'w') || 18540);
    const paragrafosDoc = Array.from(body.children).filter((c) => c.localName === 'p');
    const renderizados = Array.from(secao.querySelectorAll<HTMLElement>(':scope > article > p'));
    if (paragrafosDoc.length !== renderizados.length) {
      console.warn('[docx tipografia] parágrafos divergentes', paragrafosDoc.length, renderizados.length);
      this.quebrarPaginaEntreSecoes(secao, body, W);
      return;
    }

    paragrafosDoc.forEach((p, idx) => {
      const el = renderizados[idx];
      const pPr = filho(p, 'pPr');
      const estilo = attr(filho(pPr, 'pStyle')) || estiloPadrao;
      // O recuo deslocado do título foi medido para "DE RIBEIRÃO PRETO".
      // Nomes mais curtos, como "DE BACABAL", ficavam grudados à esquerda da primeira linha.
      if (estilo === 'Heading1') {
        const ind = filho(filho(estilos.get(estilo), 'pPr'), 'ind');
        const esquerda = Number(attr(ind, 'left') || 0);
        const direita = Number(attr(ind, 'right') || 0);
        const suspenso = Number(attr(ind, 'hanging') || 0);
        const largura = larguraPagina - (esquerda - suspenso) - direita;
        const lado = Math.max(0, (larguraPagina - largura) / 2) / 20;
        el.style.marginInlineStart = lado + 'pt';
        el.style.marginInlineEnd = lado + 'pt';
        el.style.textIndent = '0';
        el.style.textAlign = 'center';
      }
      const fonteEstilo = doEstilo(estilo, 'rFonts') || doEstilo(estiloPadrao, 'rFonts') || 'Arial';
      const szEstilo = Number(doEstilo(estilo, 'sz') || doEstilo(estiloPadrao, 'sz') || szPadrao) / 2;
      const negritoEstilo = (doEstilo(estilo, 'b') ?? doEstilo(estiloPadrao, 'b')) === 'true';
      const marca = filho(pPr, 'rPr');
      const fonteMarca = attr(filho(marca, 'rFonts'), 'ascii') || fonteEstilo;
      const szMarca = Number(attr(filho(marca, 'sz')) || szEstilo * 2) / 2;

      const sp = filho(pPr, 'spacing');
      const regra = attr(sp, 'lineRule') || 'auto';
      const linha = Number(attr(sp, 'line') || 240);
      const depois = Number(attr(sp, 'after') || 0) / 20;
      const fator = regra === 'auto' ? linha / 240 : 1;

      const runs = Array.from(p.children).flatMap((c) =>
        c.localName === 'r' ? [c] : c.localName === 'hyperlink' ? Array.from(c.children).filter((r) => r.localName === 'r') : []
      );
      const spans = Array.from(el.querySelectorAll<HTMLElement>(':scope > span, :scope > a > span'));
      const alinhados = runs.length === spans.length;
      if (!alinhados && runs.some((r) => filho(filho(r, 'rPr'), 'spacing') || filho(filho(r, 'rPr'), 'w'))) {
        console.warn('[docx tipografia] runs divergentes no parágrafo', idx, runs.length, spans.length);
      }

      let alturaTexto = 0;
      runs.forEach((r, i) => {
        const rPr = filho(r, 'rPr');
        const fonte = attr(filho(rPr, 'rFonts'), 'ascii') || fonteEstilo;
        const sz = Number(attr(filho(rPr, 'sz')) || szEstilo * 2) / 2;
        const texto = Array.from(r.getElementsByTagNameNS(W, 't')).map((t) => t.textContent || '').join('');
        if (texto) alturaTexto = Math.max(alturaTexto, sz * this.alturaLinha(fonte));
        const span = alinhados ? spans[i] : undefined;
        if (!span) return;
        if (texto) {
          span.style.fontFamily = `'${fonte}', sans-serif`;
          span.style.fontSize = sz + 'pt';
          span.style.fontWeight = (ligado(filho(rPr, 'b')) ?? negritoEstilo) ? '700' : '400';
        }

        let espacamento = Number(attr(filho(rPr, 'spacing')) || 0) / 20;
        const escala = Number(attr(filho(rPr, 'w')) || 100) / 100;
        const caracteres = Array.from(texto).length;
        if (escala !== 1 && caracteres) {
          espacamento += ((span.getBoundingClientRect().width * 0.75) * (escala - 1)) / caracteres;
        }
        if (espacamento) span.style.letterSpacing = espacamento.toFixed(3) + 'pt';
        if (regra === 'auto') span.style.lineHeight = (fator * this.alturaLinha(fonte)).toFixed(4);
      });

      el.style.fontSize = szMarca + 'pt';
      if (!alinhados) {
        el.style.fontFamily = `'${fonteEstilo}', sans-serif`;
        el.style.fontWeight = negritoEstilo ? '700' : '400';
      }
      if (regra === 'auto') {
        el.style.lineHeight = (fator * this.alturaLinha(fonteMarca)).toFixed(4);
        if (!alturaTexto) el.style.minHeight = (fator * szMarca * this.alturaLinha(fonteMarca)).toFixed(3) + 'pt';
        if (alturaTexto && fator > 1) {
          const deslocamento = ((fator - 1) * alturaTexto) / 2;
          el.style.paddingTop = deslocamento.toFixed(3) + 'pt';
          el.style.marginBottom = (depois - deslocamento).toFixed(3) + 'pt';
        }
      }
    });

    this.quebrarPaginaEntreSecoes(secao, body, W);
  }

  // O docx-preview junta seções "continuous" na mesma página; no Word a segunda começa
  // numa página nova, abaixo da margem superior da própria seção.
  private quebrarPaginaEntreSecoes(secao: HTMLElement, body: Element, W: string): void {
    const artigos = Array.from(secao.querySelectorAll<HTMLElement>(':scope > article'));
    const alturaPaginaPt = parseFloat(secao.style.minHeight);
    if (artigos.length < 2 || !alturaPaginaPt) return;

    const sectPrs = Array.from(body.getElementsByTagNameNS(W, 'sectPr'));
    const topoSecao = secao.getBoundingClientRect().top;
    const alturaPagina = alturaPaginaPt * (96 / 72);
    artigos.slice(1).forEach((artigo, i) => {
      const pgMar = sectPrs[i + 1]?.getElementsByTagNameNS(W, 'pgMar')[0];
      const margemTopo = Number(pgMar?.getAttributeNS(W, 'top') || 1440) / 15;
      const atual = artigo.getBoundingClientRect().top - topoSecao;
      const desejado = alturaPagina * (i + 1) + margemTopo;
      if (desejado > atual) artigo.style.marginTop = desejado - atual + 'px';
      artigo.dataset['paginaInicio'] = String(alturaPagina * (i + 1));
    });
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

    const stylesTxt = await zip.file('word/styles.xml')?.async('string');
    const estiloNormal = stylesTxt
      ? Array.from(parser.parseFromString(stylesTxt, 'application/xml').getElementsByTagNameNS(NS.w, 'style')).find(
          (s) => s.getAttributeNS(NS.w, 'type') === 'paragraph' && s.getAttributeNS(NS.w, 'default') === '1'
        )
      : undefined;
    const fonteNormal = estiloNormal?.getElementsByTagNameNS(NS.w, 'rFonts')[0]?.getAttributeNS(NS.w, 'ascii') || 'Arial';
    const fonte = `'${fonteNormal}', sans-serif`;

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
      const regra = spW('lineRule') || 'auto';
      const fator = line && regra === 'auto' ? line / 240 : 1;
      const marca = pPr?.getElementsByTagNameNS(NS.w, 'rPr')[0];
      const fonteMarca = marca?.getElementsByTagNameNS(NS.w, 'rFonts')[0]?.getAttributeNS(NS.w, 'ascii') || fonte;
      if (line && regra !== 'auto') el.style.lineHeight = (line / 20) * (96 / 72) + 'px';
      else el.style.lineHeight = (fator * this.alturaLinha(fonteMarca)).toFixed(4);
      const szMarca = pPr?.getElementsByTagNameNS(NS.w, 'sz')[0]?.getAttributeNS(NS.w, 'val');
      const szPrimeiro = p.getElementsByTagNameNS(NS.w, 'r')[0]?.getElementsByTagNameNS(NS.w, 'sz')[0]?.getAttributeNS(NS.w, 'val');
      const szBase = szMarca || szPrimeiro;
      if (szBase) el.style.fontSize = (Number(szBase) / 2) * (96 / 72) + 'px';
      let alturaTexto = 0;
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
        const fonteRun = rPr?.getElementsByTagNameNS(NS.w, 'rFonts')[0]?.getAttributeNS(NS.w, 'ascii');
        span.style.fontFamily = `'${fonteRun || fonteNormal}', sans-serif`;
        const espacamento = Number(rPr?.getElementsByTagNameNS(NS.w, 'spacing')[0]?.getAttributeNS(NS.w, 'val') || 0) / 20;
        if (espacamento) span.style.letterSpacing = espacamento + 'pt';
        if (!line || regra === 'auto') span.style.lineHeight = (fator * this.alturaLinha(fonteRun || fonte)).toFixed(4);
        if (t.trim()) alturaTexto = Math.max(alturaTexto, (Number(sz || szBase || 22) / 2) * (96 / 72) * this.alturaLinha(fonteRun || fonte));
        if (rPr?.getElementsByTagNameNS(NS.w, 'b').length) span.style.fontWeight = '700';
        if (rPr?.getElementsByTagNameNS(NS.w, 'i').length) span.style.fontStyle = 'italic';
        const cor = rPr?.getElementsByTagNameNS(NS.w, 'color')[0]?.getAttributeNS(NS.w, 'val');
        if (cor && cor !== 'auto') span.style.color = '#' + cor;
        el.appendChild(span);
        if (br) el.appendChild(document.createElement('br'));
        if (t.trim()) temTexto = true;
      });
      if (!temTexto) el.style.minHeight = (line && regra !== 'auto' ? (line / 20) * (96 / 72) + 'px' : (fator * this.alturaLinha(fonteMarca)).toFixed(4) + 'em');
      if (temTexto && fator > 1) {
        const deslocamento = ((fator - 1) * alturaTexto) / 2;
        el.style.paddingTop = deslocamento + 'px';
        el.style.marginBottom = Number(spW('after') || 0) / 15 - deslocamento + 'px';
      }
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
      const atrasDoTexto = anc.getAttribute('behindDoc') === '1';

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
      if (atrasDoTexto) grupo.style.zIndex = '-1';
      grupo.style.left = (posH?.getAttribute('relativeFrom') === 'page' ? offH : offH + 28) + 'px';
      grupo.style.top = (posV?.getAttribute('relativeFrom') === 'page' ? offV : ref.getBoundingClientRect().top - topoSecao + offV) + 'px';
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

    this.posicionarAssinatura(secao);

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

  // No Word a assinatura fica acima do traço e o nome abaixo. No preview o nome sobe e cruza o traço.
  private posicionarAssinatura(secao: HTMLElement): void {
    const cargo = Array.from(secao.querySelectorAll<HTMLElement>('p')).find((p) => (p.textContent || '').trim() === 'Reitor (a)');
    const nome = cargo?.previousElementSibling as HTMLElement | null;
    if (!cargo || !nome || nome.tagName !== 'P') return;

    const linha = Array.from(secao.querySelectorAll<HTMLElement>('.docx-grupo > div'))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => !el.querySelector('img') && r.height <= 3 && r.width > 60 && r.width < 400)
      .sort((a, b) => a.r.top - b.r.top)[0];
    if (!linha) return;

    const folga = 4;
    const deslocamento = linha.r.bottom + folga - nome.getBoundingClientRect().top;
    if (deslocamento > 0) nome.style.marginTop = (parseFloat(nome.style.marginTop) || 0) + deslocamento + 'px';
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
    const url = this.enderecoDiploma;
    alvo.src = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 512 });
    alvo.removeAttribute('srcset');
    this.qrAlvo = alvo;
  }

  async baixarPdfEstacio(): Promise<void> {
    const host = this.docxHost?.nativeElement;
    const paginas = Array.from(host?.querySelectorAll<HTMLElement>('.docx-pagina') ?? []);
    if (!paginas.length || this.gerandoPdf) return;

    this.gerandoPdf = true;
    try {
      const [{ jsPDF }, { toCanvas }] = await Promise.all([import('jspdf'), import('html-to-image')]);
      await document.fonts.ready;
      let pdf: InstanceType<typeof jsPDF> | null = null;

      for (const pagina of paginas) {
        const stage = pagina.querySelector<HTMLElement>('.docx-stage');
        if (!stage) continue;
        const largura = Number(pagina.style.getPropertyValue('--w'));
        const altura = Number(pagina.style.getPropertyValue('--h'));
        const canvas = await toCanvas(stage, {
          width: largura,
          height: altura,
          pixelRatio: 3,
          backgroundColor: '#ffffff',
          skipFonts: true,
          style: { transform: 'none', position: 'static' },
        });

        const formato: [number, number] = [largura * 0.75, altura * 0.75];
        const orientacao = largura >= altura ? 'landscape' : 'portrait';
        if (!pdf) pdf = new jsPDF({ orientation: orientacao, unit: 'pt', format: formato, compress: true });
        else pdf.addPage(formato, orientacao);
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, formato[0], formato[1], undefined, 'FAST');
      }

      pdf?.save(`diploma-${this.publicacaoEstacio.pub_id}.pdf`);
    } catch (e) {
      console.error('[pdf] falha ao gerar', e);
    } finally {
      this.gerandoPdf = false;
    }
  }

  baixarXmlEstacio(): void {
    const xml = this.montarXmlEstacio();
    const codigo = this.publicacaoEstacio?.pub_id;
    if (!xml || !codigo) return;
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `diploma-${codigo}.xml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  enviarXmlConformidade(): void {
    const xml = this.montarXmlEstacio();
    const codigo = this.publicacaoEstacio?.pub_id;
    if (!xml || !codigo) return;
    sessionStorage.setItem('xmlConformidade', JSON.stringify({
      codigo,
      nome: `diploma-${codigo}.xml`,
      xml,
    }));
  }

  private montarXmlEstacio(): string | null {
    return montarXmlDiploma(this.publicacaoEstacio);
  }

  dataPorExtenso(valor: string): string {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor ?? '');
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    const [dia, mes, ano] = br ? [br[1], br[2], br[3]] : iso ? [iso[3], iso[2], iso[1]] : [];
    if (!dia || !meses[Number(mes) - 1]) return valor;
    return `${Number(dia)} de ${meses[Number(mes) - 1]} de ${ano}`;
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
