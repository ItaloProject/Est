import { Component, ElementRef, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BuscaService } from '../../services/busca.service';

type StatusVerificacao = 'sucesso' | 'erro' | 'alerta';

interface ItemVerificacao {
  titulo: string;
  descricao: string;
  status: StatusVerificacao;
}

const NAMESPACE_DIPLOMA = 'http://portal.mec.gov.br/diplomadigital/arquivos-em-xsd';
const NAMESPACE_ASSINATURA = 'http://www.w3.org/2000/09/xmldsig#';
const MEC = 'https://www.gov.br/mec/pt-br';
const VERIFICADOR = 'https://verificadordiplomadigital.mec.gov.br/diploma';

@Component({
  selector: 'app-conformidade',
  standalone: false,
  templateUrl: './conformidade.component.html',
  styleUrls: ['./conformidade.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  host: { '[class.ds-pronto]': 'estiloPronto()' },
})
export class ConformidadeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private _busca = inject(BuscaService);

  estiloPronto = signal(false);

  readonly iconeBusca =
    'M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z';

  readonly funcionalidades = [
    { titulo: 'Validador', url: `${VERIFICADOR}#validador` },
    { titulo: 'Saiba mais', url: `${VERIFICADOR}#saiba-mais` },
    { titulo: 'Dúvidas Frequentes', url: `${VERIFICADOR}#duvidas-frequentes` },
  ];

  readonly rodape = [
    {
      titulo: 'Composição',
      url: `${MEC}/composicao`,
      links: [
        { titulo: 'Competências', url: `${MEC}/acesso-a-informacao/institucional/competencias` },
        { titulo: 'Gabinete do Ministro', url: `${MEC}/acesso-a-informacao/institucional/gabinete-do-ministro` },
        { titulo: 'Secretarias', url: `${MEC}/acesso-a-informacao/institucional/secretarias` },
        { titulo: 'Estrutura Organizacional', url: `${MEC}/acesso-a-informacao/institucional/estrutura-organizacional` },
      ],
    },
    {
      titulo: 'Canais de Atendimento',
      url: 'https://sistema.ouvidorias.gov.br/publico/Manifestacao/SelecionarTipoManifestacao.aspx?ReturnUrl=%2f',
      links: [
        { titulo: 'Ouvidoria', url: 'https://sistema.ouvidorias.gov.br/publico/Manifestacao/SelecionarTipoManifestacao.aspx?ReturnUrl=%2f' },
        { titulo: 'Área de imprensa', url: `${MEC}/canais_atendimento/area-de-imprensa` },
        { titulo: 'Fale Conosco', url: `${MEC}/canais_atendimento/fale-conosco` },
      ],
    },
    {
      titulo: 'Acesso à informação',
      url: `${MEC}/acesso-a-informacao`,
      links: [
        { titulo: 'Institucional', url: `${MEC}/acesso-a-informacao/institucional` },
        { titulo: 'Ações e Programas', url: `${MEC}/acesso-a-informacao/acoes-e-programas` },
        {
          titulo: 'Instância Permanente de Negociação e Cooperação',
          url: `${MEC}/acesso-a-informacao/instancia-permanente-de-negociacao-e-cooperacao`,
        },
        { titulo: 'Participação Social', url: `${MEC}/acesso-a-informacao/participacao-social` },
      ],
    },
    {
      titulo: 'Centrais de Conteúdo',
      url: `${MEC}/centrais-de-conteudo`,
      links: [
        { titulo: 'Vídeos', url: `${MEC}/centrais-de-conteudo/videos` },
        { titulo: 'Áudios', url: `${MEC}/centrais-de-conteudo/audios` },
        { titulo: 'Fotos', url: 'https://www.flickr.com/photos/mineducacao/albums' },
        {
          titulo: 'Aplicativos',
          url: 'https://www.gov.br/clientes/portalgovbr/portalgovbr/pt-br/apps/@@galeria-de-aplicativos?categoria_path=/pt-br/categorias/educacao-e-pesquisa',
        },
        { titulo: 'Campanhas', url: `${MEC}/centrais-de-conteudo/campanhas-1` },
      ],
    },
    {
      titulo: 'Sistemas',
      url: `${MEC}/sistema`,
      links: [
        { titulo: 'Sisu', url: 'https://sisu.mec.gov.br/' },
        { titulo: 'Prouni', url: 'http://siteprouni.mec.gov.br/' },
        { titulo: 'Fies', url: 'http://fies.mec.gov.br/' },
        { titulo: 'E-mec', url: 'http://emec.mec.gov.br/' },
      ],
    },
    {
      titulo: 'Verificação de conformidade da Estrutura XML do Diploma Digital',
      url: `${MEC}/diploma-digital`,
      links: [
        { titulo: 'Instituições', url: `${MEC}/diploma-digital/instituicoes` },
        { titulo: 'Legislação', url: `${MEC}/diploma-digital/legislacao` },
        { titulo: 'Perguntas Frequentes', url: `${MEC}/diploma-digital/perguntas-frequentes` },
      ],
    },
  ];

  readonly redesSociais = [
    { titulo: 'Twitter', classe: 'twitter', url: 'https://www.twitter.com/mec_comunicacao' },
    { titulo: 'YouTube', classe: 'youtube', url: 'https://www.youtube.com/ministeriodaeducacao' },
    { titulo: 'Facebook', classe: 'facebook', url: 'https://www.facebook.com/ministeriodaeducacao/' },
    { titulo: 'Flickr', classe: 'flickr', url: 'https://www.flickr.com/mineducacao' },
    { titulo: 'Instagram', classe: 'instagram', url: 'https://www.instagram.com/mineducacao' },
    { titulo: 'SoundCloud', classe: 'soundcloud', url: 'https://soundcloud.com/mineducacao' },
  ];

  constructor() {
    const estilo = document.createElement('link');
    estilo.rel = 'stylesheet';
    estilo.href = 'assets/govbr/dsgov.css';
    estilo.onload = estilo.onerror = () => this.estiloPronto.set(true);
    this.elemento.nativeElement.shadowRoot.prepend(estilo);
  }

  nomeArquivo = '';
  tamanhoArquivo = '';
  conteudo: string = null;
  verificacoes: ItemVerificacao[] = [];

  get conforme(): boolean {
    return this.verificacoes.length > 0 && this.verificacoes.every((v) => v.status !== 'erro');
  }

  ngOnInit(): void {
    const codigo = this.route.snapshot.paramMap.get('id') ?? '';
    const salvo = JSON.parse(sessionStorage.getItem('diplomaDigital'));
    sessionStorage.removeItem('diplomaDigital');

    if (codigo && salvo && salvo.codValidacaoDiploma === codigo && salvo.codXmlPublico) {
      const bytes = Uint8Array.from(atob(salvo.codXmlPublico), (c) => c.charCodeAt(0));
      this.nomeArquivo = 'documento.xml';
      this.tamanhoArquivo = this.calcularTamanho(bytes.length);
      this.conteudo = new TextDecoder('utf-8').decode(bytes);
    }
  }

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) {
      return;
    }

    this.verificacoes = [];
    this.nomeArquivo = arquivo.name;
    this.tamanhoArquivo = this.calcularTamanho(arquivo.size);
    this.conteudo = null;

    if (!arquivo.name.toLowerCase().endsWith('.xml')) {
      this.verificacoes = [
        { titulo: 'Formato do arquivo', descricao: 'Selecione um arquivo com extensão .xml.', status: 'erro' },
      ];
      return;
    }

    arquivo.text().then((texto) => (this.conteudo = texto));
  }

  verificar(): void {
    const documento = new DOMParser().parseFromString(this.conteudo, 'application/xml');

    if (documento.getElementsByTagName('parsererror').length) {
      this.verificacoes = [
        { titulo: 'Estrutura do XML', descricao: 'O arquivo não é um XML bem formado.', status: 'erro' },
      ];
      return;
    }

    const raiz = documento.documentElement;
    const possui = (tag: string) => documento.getElementsByTagNameNS('*', tag).length > 0;
    const assinaturas = documento.getElementsByTagNameNS(NAMESPACE_ASSINATURA, 'Signature').length;
    const codigoValidacao = documento.getElementsByTagNameNS('*', 'CodigoValidacao')[0]?.textContent?.trim() ?? '';

    this.verificacoes = [
      { titulo: 'Estrutura do XML', descricao: 'O arquivo é um XML bem formado.', status: 'sucesso' },
      {
        titulo: 'Tipo de documento',
        descricao: raiz.localName === 'Diploma' ? 'Documento do tipo Diploma.' : `Elemento raiz encontrado: ${raiz.localName}.`,
        status: raiz.localName === 'Diploma' ? 'sucesso' : 'erro',
      },
      {
        titulo: 'Namespace do MEC',
        descricao:
          raiz.namespaceURI === NAMESPACE_DIPLOMA
            ? 'O documento utiliza o namespace oficial do Diploma Digital.'
            : 'O namespace do documento difere do namespace oficial do Diploma Digital.',
        status: raiz.namespaceURI === NAMESPACE_DIPLOMA ? 'sucesso' : 'alerta',
      },
      {
        titulo: 'Dados do diploma',
        descricao: possui('DadosDiploma') ? 'Seção DadosDiploma encontrada.' : 'Seção DadosDiploma não encontrada.',
        status: possui('DadosDiploma') ? 'sucesso' : 'erro',
      },
      {
        titulo: 'Dados do registro',
        descricao: possui('DadosRegistro') ? 'Seção DadosRegistro encontrada.' : 'Seção DadosRegistro não encontrada.',
        status: possui('DadosRegistro') ? 'sucesso' : 'erro',
      },
      {
        titulo: 'Assinaturas digitais',
        descricao: assinaturas
          ? `${assinaturas} assinatura(s) digital(is) encontrada(s).`
          : 'Nenhuma assinatura digital encontrada.',
        status: assinaturas ? 'sucesso' : 'erro',
      },
      {
        titulo: 'Plataforma de origem',
        descricao: codigoValidacao
          ? 'Verificando registro na plataforma...'
          : 'Código de validação não encontrado no XML.',
        status: codigoValidacao ? 'alerta' : 'erro',
      },
    ];

    if (codigoValidacao) {
      const idx = this.verificacoes.length - 1;
      this._busca.getDiplomaDigital(codigoValidacao).subscribe({
        next: () => {
          this.verificacoes[idx] = {
            titulo: 'Plataforma de origem',
            descricao: 'Diploma registrado e validado nesta plataforma.',
            status: 'sucesso',
          };
          this.verificacoes = [...this.verificacoes];
        },
        error: () => {
          this.verificacoes[idx] = {
            titulo: 'Plataforma de origem',
            descricao: 'Este XML não foi gerado por esta plataforma.',
            status: 'erro',
          };
          this.verificacoes = [...this.verificacoes];
        },
      });
    }
  }

  limpar(): void {
    this.nomeArquivo = '';
    this.tamanhoArquivo = '';
    this.conteudo = null;
    this.verificacoes = [];
  }

  private calcularTamanho(bytes: number): string {
    const unidades = ['B', 'KB', 'MB', 'GB'];
    let valor = bytes;
    let i = 0;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(i ? 2 : 0)} ${unidades[i]}`;
  }
}
