const NAMESPACE = 'http://portal.mec.gov.br/diplomadigital/arquivos-em-xsd';
const VERSAO = '1.05';
const CODIGO_VALIDACAO = /^\d+\.\d+\.[0-9a-f]{12}$/i;

const EMISSORA = {
  nome: 'CENTRO UNIVERSITÁRIO ESTÁCIO DE RIBEIRÃO PRETO',
  codigo: '1270',
  cnpj: '07195358000166',
  logradouro: 'RUA ABRAHÃO ISSA HALACK',
  numero: '980',
  bairro: 'RIBEIRANIA',
  codigoMunicipio: '3543402',
  municipio: 'RIBEIRÃO PRETO',
  uf: 'SP',
  cep: '14096160',
  credenciamento: { tipo: 'Portaria', numero: '2969', data: '2005-08-29', publicacao: '2005-08-30', secao: '1', pagina: '8' },
  mantenedora: 'SOCIEDADE DE ENSINO SUPERIOR ESTÁCIO DE RIBEIRÃO PRETO LTDA',
};

const REGISTRADORA = {
  nome: 'UNIVERSIDADE ESTÁCIO DE SÁ',
  codigo: '163',
  cnpj: '34075739000184',
  logradouro: 'AVENIDA DAS AMERICAS',
  numero: '4200',
  bairro: 'BARRA DA TIJUCA',
  codigoMunicipio: '3304557',
  municipio: 'RIO DE JANEIRO',
  uf: 'RJ',
  cep: '22640102',
  credenciamento: { tipo: 'Portaria', numero: '442', data: '2009-05-11', publicacao: '2009-05-12', secao: '1', pagina: '150' },
  mantenedora: 'SOCIEDADE DE ENSINO SUPERIOR ESTÁCIO DE SÁ',
  mantenedoraLogradouro: 'RUA MORAIS E SILVA',
  mantenedoraNumero: '40',
  mantenedoraBairro: 'MARACANÃ',
  mantenedoraCep: '20271030',
};

export const CAMPOS_XML_DIPLOMA = [
  'CodigoValidacao', 'Protocolo', 'Status',
  'Nome', 'CPF', 'DataNascimento', 'Nacionalidade', 'Naturalidade', 'RG', 'OrgaoExpedidor',
  'NomeMae', 'NomePai',
  'Curso', 'Modalidade', 'ReconhecimentoCurso', 'AnoConclusao',
  'DataConclusao', 'DataColacaoGrau', 'Reitor',
  'LocalExpedicao', 'DataExpedicao',
  'NumeroRegistro', 'LivroRegistro', 'FolhaRegistro', 'DataRegistro', 'ProcessoRegistro',
  'Instituicao', 'INEP', 'Endereco', 'Bairro', 'CEP',
  'Observacao',
] as const;

export const ELEMENTOS_XML_DIPLOMA = [
  'Diploma', 'infDiploma', 'DadosDiploma', 'DadosRegistro',
  'Diplomado', 'ID', 'Nome', 'Sexo', 'Nacionalidade', 'Naturalidade',
  'CodigoMunicipio', 'NomeMunicipio', 'UF', 'CPF',
  'OutroDocumentoIdentificacao', 'TipoDocumento', 'Identificador', 'DataNascimento',
  'DataConclusao', 'DadosCurso', 'NomeCurso', 'CodigoCursoEMEC', 'Modalidade',
  'TituloConferido', 'OutroTitulo', 'GrauConferido', 'EnderecoCurso',
  'Logradouro', 'Numero', 'Bairro', 'CEP',
  'Autorizacao', 'Reconhecimento', 'Credenciamento', 'Tipo', 'Data',
  'DataPublicacao', 'SecaoPublicacao', 'PaginaPublicacao',
  'IesEmissora', 'IesRegistradora', 'CodigoMEC', 'CNPJ', 'Endereco', 'Mantenedora', 'RazaoSocial',
  'LivroRegistro', 'NumeroFolhaDoDiploma', 'NumeroSequenciaDoDiploma', 'ProcessoDoDiploma',
  'DataColacaoGrau', 'DataExpedicaoDiploma', 'DataRegistroDiploma',
  'ResponsavelRegistro', 'IdDocumentacaoAcademica', 'Seguranca', 'CodigoValidacao',
] as const;

const UFS = new Set([
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]);

type No = {
  tag: string;
  attrs?: Record<string, string>;
  texto?: string;
  filhos?: No[];
};

type Publicacao = Record<string, unknown>;

export function montarXmlDiploma(d: Publicacao | null | undefined): string | null {
  if (!d) return null;
  const pubId = texto(d['pub_id']);
  if (!pubId) return null;
  const nonce = nonce44(pubId);
  const codigo = codigoOficial(pubId);

  const diplomado = el('Diplomado', [
    txt('ID', d['id']),
    txt('Nome', d['nome']),
    txt('Sexo', sexo(d['sexo'])),
    txt('Nacionalidade', d['nacionalidade']),
    naturalidade(d['naturalidade']),
    txt('CPF', cpf(d['cpf'])),
    documento(d['rg'], d['orgao_expedidor']),
    txt('DataNascimento', isoData(d['nascimento'])),
  ]);
  const curso = el('DadosCurso', [
    txt('NomeCurso', d['curso']),
    txt('CodigoCursoEMEC', digitos(d['codigo_curso_emec'])),
    txt('Modalidade', modalidade(d['modalidade'])),
    titulo(d['modalidade']),
    grau(d['modalidade']),
    enderecoCurso(d),
    ato('Autorizacao', d['curso_autorizacao']),
    ato('Reconhecimento', d['curso_reconhecimento']),
  ]);
  const dadosDiploma = el('DadosDiploma', [
    diplomado,
    txt('DataConclusao', isoData(d['data'])),
    curso,
    iesEmissora(d),
  ], { id: `Dip${nonce}` });
  const dadosRegistro = el('DadosRegistro', [
    iesRegistradora(),
    livro(d),
    txt('IdDocumentacaoAcademica', `ReqDip${nonce}`),
    el('Seguranca', [txt('CodigoValidacao', codigo)]),
  ], { id: `RDip${nonce}` });
  const inf = el('infDiploma', [dadosDiploma, dadosRegistro], {
    versao: VERSAO,
    id: `VDip${nonce}`,
    ambiente: 'Produção',
  });
  const diploma = el('Diploma', [inf], { xmlns: NAMESPACE });
  if (!diploma) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializar(diploma, 0)}\n`;
}

const CODIGO_OFICIAL = /^\d{4}\.\d{3}\.[0-9a-f]{12}$/i;

// A máscara antiga inseria pontos no id de 10 caracteres (50286aad73 virava 502.86a.ad73).
export function codigoConsulta(codigo: string): string | null {
  const limpo = (codigo || '').trim();
  if (CODIGO_OFICIAL.test(limpo)) return limpo.toLowerCase();
  const hex = limpo.replace(/[^0-9a-f]/gi, '');
  if (/^[0-9a-f.\s-]+$/i.test(limpo) && /^[0-9a-f]{10}$/i.test(hex)) return hex.toLowerCase();
  return null;
}

export function codigoOficial(pubId: string): string {
  if (CODIGO_VALIDACAO.test(pubId)) return pubId.toLowerCase();
  const hex = pubId.replace(/[^0-9a-f]/gi, '').toLowerCase().padStart(12, '0').slice(-12);
  return `1270.163.${hex}`;
}

function nonce44(codigo: string): string {
  const hex = (codigo.replace(/[^0-9a-f]/gi, '') || '0').slice(0, 15);
  let bloco = BigInt(`0x${hex}`).toString();
  let saida = '';
  let volta = 1;
  while (saida.length < 44) {
    saida += bloco;
    bloco = (BigInt(bloco) + BigInt(volta)).toString();
    volta += 1;
  }
  return saida.slice(0, 44);
}

function iesEmissora(d: Publicacao): No | null {
  const local = municipio(d['municipio'] || d['cidade_expedicao']);
  return el('IesEmissora', [
    txt('Nome', texto(d['instituicao']) || EMISSORA.nome),
    txt('CodigoMEC', digitos(d['inep']) || EMISSORA.codigo),
    txt('CNPJ', EMISSORA.cnpj),
    enderecoDe(
      texto(d['endereco']) || EMISSORA.logradouro,
      EMISSORA.numero,
      texto(d['bairro']) || EMISSORA.bairro,
      local?.codigo || EMISSORA.codigoMunicipio,
      local?.nome || EMISSORA.municipio,
      local?.uf || EMISSORA.uf,
      digitos(d['cep']) || EMISSORA.cep,
    ),
    atoFixo('Credenciamento', EMISSORA.credenciamento),
    mantenedora(EMISSORA.mantenedora, EMISSORA.cnpj, EMISSORA),
  ]);
}

function iesRegistradora(): No | null {
  return el('IesRegistradora', [
    txt('Nome', REGISTRADORA.nome),
    txt('CodigoMEC', REGISTRADORA.codigo),
    txt('CNPJ', REGISTRADORA.cnpj),
    enderecoDe(
      REGISTRADORA.logradouro, REGISTRADORA.numero, REGISTRADORA.bairro,
      REGISTRADORA.codigoMunicipio, REGISTRADORA.municipio, REGISTRADORA.uf, REGISTRADORA.cep,
    ),
    atoFixo('Credenciamento', REGISTRADORA.credenciamento),
    mantenedora(REGISTRADORA.mantenedora, REGISTRADORA.cnpj, {
      logradouro: REGISTRADORA.mantenedoraLogradouro,
      numero: REGISTRADORA.mantenedoraNumero,
      bairro: REGISTRADORA.mantenedoraBairro,
      codigoMunicipio: REGISTRADORA.codigoMunicipio,
      municipio: REGISTRADORA.municipio,
      uf: REGISTRADORA.uf,
      cep: REGISTRADORA.mantenedoraCep,
    }),
  ]);
}

function livro(d: Publicacao): No | null {
  return el('LivroRegistro', [
    txt('LivroRegistro', d['registro_livro']),
    txt('NumeroFolhaDoDiploma', d['registro_folha']),
    txt('NumeroSequenciaDoDiploma', d['registro_numero']),
    txt('ProcessoDoDiploma', d['registro_processo']),
    txt('DataColacaoGrau', isoData(d['data_colacao'])),
    txt('DataExpedicaoDiploma', isoData(d['data_expedicao'])),
    txt('DataRegistroDiploma', isoData(d['registro_data'])),
    el('ResponsavelRegistro', [txt('Nome', d['reitor'])]),
  ]);
}

function enderecoCurso(d: Publicacao): No | null {
  if (!texto(d['curso']) || !texto(d['endereco'])) return null;
  const local = municipio(d['municipio']);
  return enderecoDe(
    texto(d['endereco']),
    null,
    texto(d['bairro']),
    local?.codigo || null,
    local?.nome || null,
    local?.uf || null,
    digitos(d['cep']),
    'EnderecoCurso',
  );
}

function enderecoDe(
  logradouro: string | null, numero: string | null, bairro: string | null,
  codigo: string | null, cidade: string | null, uf: string | null, cep: string | null,
  tag = 'Endereco',
): No | null {
  const separado = logradouro && !numero ? /^(.*?)[,\s]+(\d+)\s*$/.exec(logradouro) : null;
  return el(tag, [
    txt('Logradouro', separado ? separado[1] : logradouro),
    txt('Numero', numero || separado?.[2]),
    txt('Bairro', bairro),
    txt('CodigoMunicipio', codigo),
    txt('NomeMunicipio', cidade),
    txt('UF', uf),
    txt('CEP', cep),
  ]);
}

function mantenedora(nome: string, cnpj: string, endereco: {
  logradouro: string; numero: string; bairro: string; codigoMunicipio: string; municipio: string; uf: string; cep: string;
}): No | null {
  return el('Mantenedora', [
    txt('RazaoSocial', nome),
    txt('CNPJ', cnpj),
    enderecoDe(endereco.logradouro, endereco.numero, endereco.bairro, endereco.codigoMunicipio, endereco.municipio, endereco.uf, endereco.cep),
  ]);
}

function atoFixo(tag: string, atoDado: { tipo: string; numero: string; data: string; publicacao: string; secao: string; pagina: string }): No | null {
  return el(tag, [
    txt('Tipo', atoDado.tipo),
    txt('Numero', atoDado.numero),
    txt('Data', atoDado.data),
    txt('DataPublicacao', atoDado.publicacao),
    txt('SecaoPublicacao', atoDado.secao),
    txt('PaginaPublicacao', atoDado.pagina),
  ]);
}

function titulo(valor: unknown): No | null {
  const bruto = texto(valor);
  if (!bruto || modalidade(bruto)) return null;
  return el('TituloConferido', [txt('OutroTitulo', bruto)]);
}

function modalidade(valor: unknown): string | null {
  const n = semAcento(texto(valor) || '');
  if (n.includes('EAD') || n.includes('DISTANCIA')) return 'EAD';
  if (n.includes('PRESENCIAL')) return 'Presencial';
  return null;
}

function sexo(valor: unknown): string | null {
  const n = semAcento(texto(valor) || '');
  if (n === 'M' || n.startsWith('MASC')) return 'M';
  if (n === 'F' || n.startsWith('FEM')) return 'F';
  return null;
}

function cpf(valor: unknown): string | null {
  const bruto = digitos(valor);
  return bruto && bruto.length === 11 ? bruto : null;
}

function grau(modalidade: unknown): No | null {
  return txt('GrauConferido', grauConferido(texto(modalidade)));
}

function grauConferido(valor: string | null): string | null {
  const n = (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (n.startsWith('BACHAREL')) return 'Bacharelado';
  if (n.startsWith('LICEN')) return 'Licenciatura';
  if (n.startsWith('TECNOLOG')) return 'Tecnólogo';
  return null;
}

function documento(rg: unknown, orgao: unknown): No | null {
  const identificador = texto(rg);
  if (!identificador) return null;
  const expedidor = texto(orgao);
  return el('OutroDocumentoIdentificacao', [
    txt('TipoDocumento', expedidor ? `Identificação ${expedidor}` : 'RG'),
    txt('Identificador', identificador),
  ]);
}

function naturalidade(valor: unknown): No | null {
  const bruto = texto(valor);
  if (!bruto) return null;
  const local = municipio(bruto);
  return el('Naturalidade', [
    txt('CodigoMunicipio', local?.codigo),
    txt('NomeMunicipio', local?.nome || bruto),
    txt('UF', local?.uf),
  ]);
}

const CODIGOS_MUNICIPIO: Record<string, string> = {
  'RIBEIRAO PRETO|SP': '3543402',
  'SAO PAULO|SP': '3550308',
  'RIO DE JANEIRO|RJ': '3304557',
  'GUARULHOS|SP': '3518800',
};

function municipio(valor: unknown): { nome: string; uf: string | null; codigo: string | null } | null {
  const bruto = texto(valor);
  if (!bruto) return null;
  const partes = /^(.*?)(?:\s*[\/\-|,]\s*|\s+)([A-Za-z]{2})$/.exec(bruto);
  const uf = partes?.[2]?.toUpperCase() ?? '';
  if (partes && UFS.has(uf)) {
    const nome = partes[1].trim();
    return { nome, uf, codigo: CODIGOS_MUNICIPIO[`${semAcento(nome)}|${uf}`] ?? null };
  }
  return { nome: bruto, uf: null, codigo: null };
}

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function ato(tag: string, valor: unknown): No | null {
  const bruto = texto(valor);
  if (!bruto) return null;
  const tipo = /portaria/i.test(bruto) ? 'Portaria'
    : /resolu/i.test(bruto) ? 'Resolução'
      : /decreto/i.test(bruto) ? 'Decreto'
        : /lei/i.test(bruto) ? 'Lei'
          : null;
  const numero = /n[º°o.]?\s*(\d+)/i.exec(bruto)?.[1] ?? null;
  const datas = Array.from(bruto.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)).map((achado) => achado[1]);
  const dou = /DOU\s*n[º°o.]?\s*(\d+)[^\d]{0,40}Se[cç][aã]o\s*(\d+)[^\d]{0,40}P[aá]g\.?\s*(\d+)/i.exec(bruto);
  return el(tag, [
    txt('Tipo', tipo),
    txt('Numero', numero),
    txt('Data', isoData(datas[0] ?? null)),
    txt('DataPublicacao', isoData(datas[1] ?? null)),
    txt('SecaoPublicacao', dou?.[2]),
    txt('PaginaPublicacao', dou?.[3]),
  ]);
}

function isoData(valor: unknown): string | null {
  const bruto = texto(valor);
  if (!bruto) return null;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(bruto);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

function digitos(valor: unknown): string | null {
  const bruto = texto(valor)?.replace(/\D/g, '') ?? '';
  return bruto || null;
}

function texto(valor: unknown): string | null {
  const bruto = String(valor ?? '').trim();
  return bruto || null;
}

function txt(tag: string, valor: unknown): No | null {
  const bruto = texto(valor);
  return bruto ? { tag, texto: bruto } : null;
}

function el(tag: string, filhos: Array<No | null>, attrs?: Record<string, string>): No | null {
  const lista = filhos.filter((filho): filho is No => !!filho);
  if (!lista.length) return null;
  return { tag, attrs, filhos: lista };
}

function serializar(no: No, nivel: number): string {
  const margem = '  '.repeat(nivel);
  if (no.tag === '#comment') {
    return `${margem}<!-- ${esc(no.texto).replace(/--/g, '')} -->`;
  }
  const attrs = Object.entries(no.attrs ?? {})
    .map(([nome, valor]) => ` ${nome}="${esc(valor)}"`)
    .join('');
  if (no.texto != null) return `${margem}<${no.tag}${attrs}>${esc(no.texto)}</${no.tag}>`;
  const corpo = (no.filhos ?? []).map((filho) => serializar(filho, nivel + 1)).join('\n');
  return `${margem}<${no.tag}${attrs}>\n${corpo}\n${margem}</${no.tag}>`;
}

function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
