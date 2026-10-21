import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { BuscaService } from '../../services/busca.service';
import { environment } from '../../../environments/environment';
import { codigoConsulta } from '../../services/xml-diploma';
import { DiplomaComponent } from '../diploma/diploma.component';

@Component({
  selector: 'app-main',
  standalone: false,
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private _busca = inject(BuscaService);
  private route = inject(Router);
  private spinner = inject(NgxSpinnerService);

  ies: any;
  isLoading = false;
  opened: boolean[] = [];
  pesquisarTipo = [false, false, false];
  indexBotao: number | null = null;
  botaoPesquisa = ['Ler QRCODE', 'Buscar por Nome ou Número do Registro', 'Buscar por Número de Registro'];
  botaoVoltar = false;
  erroDiploma = false;
  diplomaDigital: any;
  buscaForm: any;
  mascaraCodigo = 'AAAAAAAAAA||AAAA.AAA.AAAAAAAAAAAA';

  faq = {
    texto:
      'Busca de Informações de Registro de Diplomas Em atendimento à Portaria MEC nº 1.095/2018, publicada no Diário Oficial da União em 26.10.2018, que dispõe sobre a expedição e o registro de diplomas de cursos superiores de graduação no âmbito do sistema federal de ensino, a $INSTITUICAO disponibiliza nesta página todos os Diplomas dos alunos que colaram grau a partir de 25.4.2019 para fins de verificação de autenticidade.',
    duvidas: [
      {
        duvida: '1. O que é o diploma digital?',
        texto:
          'Diploma digital de curso superior de graduação é aquele que tem sua existência, sua emissão e seu armazenamento inteiramente no meio digital, e cuja validade jurídica é presumida mediante a assinatura com certificação digital e carimbo de tempo na Infraestrutura de Chaves Públicas Brasileira - ICP-Brasil, conforme os parâmetros do Padrão Brasileiro de Assinaturas Digitais – PBAD. Assim, o Diploma Digital é a representação eletrônica do diploma de conclusão de curso de graduação. De acordo com a Portaria nº 544, de 11.3.2019, publicada no Diário Oficial da União no dia 12.3.2019, que dispõe sobre a emissão e o registro de diploma de graduação, por meio digital, todas as instituições de ensino superior públicas e privadas pertencentes ao Sistema Federal de Ensino deverão emitir o Diploma Digital, que será um documento com existência, emissão e armazenamento integralmente digitais.',
      },
      {
        duvida: '2. Quando poderei ter o meu Diploma Digital?',
        texto:
          'Cada IES irá elaborar um cronograma de implementação, respeitando sua autonomia, de modo que em dezembro de 2021 esteja em plena atividade a emissão e/ou registro de diploma no formato digital. Dessa maneira, a partir de 1º janeiro de 2022, todo diploma de graduação no Brasil será digital.',
      },
      {
        duvida: '3. Depois de formado, sendo um ex-aluno, como será o meu acesso ao diploma?',
        texto:
          'A IES deve garantir a consulta e a validação do Diploma Digital bem como a disponibilidade de acesso ao ambiente virtual institucional por intermédio de um endereço eletrônico destinado exclusivamente a instituições de ensino, onde serão possíveis o acesso ao XML do Diplomado bem como a geração e o download da Representação Visual do Diploma Digital (RVDD), a qualquer tempo.',
      },
      {
        duvida: '4. Diploma Digital e diploma impresso têm o mesmo valor jurídico?',
        texto:
          'Sim. O uso do ICP-Brasil ao longo de todo o processo garante a que o Diploma Digital tenha todas as garantia e validade do documento físico. A diferença está na segurança e facilidade para verificação, que evita fraudes ao reforçar a segurança para registro e emissão de diplomas digitais.',
      },
      {
        duvida: '5. O diploma físico perderá sua validade com o diploma digital?',
        texto:
          'Não. O diploma físico já emitido não perde sua validade. A questão é que um diploma já emitido e registrado de modo digital terá toda sua existência neste meio eletrônico. O diploma digital é um documento oficial, juridicamente válido, tanto quanto o físico. Por ser um documento nato digital, será emitido, registrado no formato digital e sempre será acessado de forma eletrônica. Apesar de ser um documento em XML, haverá uma representação visual (RVDD) que será sua interface – e por meio de um QR Code ou uma URL, poderá ser validado digitalmente de forma prática, rápida e segura.',
      },
      {
        duvida: '6. Possuo o diploma físico, terei que solicitar o diploma digital?',
        texto:
          'Não. Os diplomas emitidos no formato físico não precisam ser substituídos ou reemitidos. A partir do dia 1.1.2022, todas as Instituições de Ensino Superior deverão emitir seus diplomas no formato digital. Após esta implantação, as instituições não irão mais emitir os diplomas em formato físico para os cursos de graduação.',
      },
      {
        duvida: '7. É possível imprimir o Diploma Digital?',
        texto:
          'É possível apenas imprimir a Representação Visual do Diploma Digital (RVDD). Entretanto, a RVDD não poderá ser considerada como o diploma. A representação visual do Diploma Digital não substitui o diploma digital no padrão XML podendo ser utilizado o modelo adotado pela IES para diploma em meio físico, acrescido dos mecanismos de acesso ao XML do diploma digital assinado, mas este não é do Diploma Digital.',
      },
      {
        duvida: '8. O diploma digital impresso terá validade jurídica?',
        texto:
          'Não, uma vez que só é possível assegurar a validade jurídica de documentos digitalmente assinados por meio da verificação da certificação digital, que é desenvolvida para o meio eletrônico. A assinatura digital é um conjunto de dados criptográficos incorporados a um documento. Desta forma, a validação da assinatura digital de um documento precisa ser feita no ambiente digital, uma vez que há necessidade de softwares e sistemas específicos para ler e compreender estes dados criptografados.',
      },
      {
        duvida: '9. O que é XML?',
        texto:
          'O XML Público, além da Representação Visual do Diploma Digital – RVDD, é um conjunto de informações adicionais que o formado terá acesso ao buscar sua RVDD através do link disponibilizado pela IES, assim como: dados da IES emissora (Endereço da mantenedora, credenciamento e recredenciamento); Registro do diploma (Dados da IES registradora e livro de registro) e Informações sobre o curso concluído (Autorização do curso, habilitação, reconhecimento e renovação).',
      },
      {
        duvida: '10. O que é RVDD?',
        texto:
          'A RVDD é a Representação Visual do Diploma Digital, ou seja, é a interface entre o meio digital e o meio físico para o Diploma Digital, preservando as características dos diplomas emitidos pela Instituição de Ensino. A RVDD, apesar de não ser o diploma, apresenta uma interface que, com auxílio do QR-Code ou do código de validação, possibilita a autenticidade do documento de forma rápida, prática e segura. A representação visual do diploma digital deve zelar pela exatidão e fidedignidade das informações prestadas no XML do Diploma Digital, garantindo a qualidade da imagem e a integridade de seu texto bem como possibilitando ao diplomado exibir, compartilhar e armazenar esta imagem.',
      },
      {
        duvida: '11. Meus dados pessoais ficarão expostos no diploma digital?',
        texto: 'Não. Apenas os dados que vinculam você ao grau que lhe foi outorgado.',
      },
      {
        duvida: '12. Qual é o prazo de confecção do diploma digital?',
        texto:
          'Os artigos 18 e 19 da Portaria MEC nº 1.095, de 25 de outubro de 2018, preveem que a IES deverá expedir o diploma no prazo máximo de sessenta dias, contados da colação de grau do egresso, e deverá registrar o diploma no prazo máximo de sessenta dias, contados da data de expedição do diploma.',
      },
      {
        duvida: '13. Em caso de necessidade de entrega física do diploma, como proceder?',
        texto:
          'De acordo com a Portaria MEC nº 117, de 26.2.2021, todas as Instituições de ensino Superior deverão emitir seus diplomas no formato digital. Após esta implantação, as instituições não irão mais emitir os diplomas em formato físico para os cursos de graduação.',
      },
      {
        duvida: '14. A emissão do diploma digital ocorrerá logo após a finalização do meu curso e sem necessidade de solicitação?',
        texto:
          'Sim, sem necessidade de nenhuma solicitação. Ao concluir a colação de grau, o diploma digital ficará disponível na Área do Aluno no site da Instituição. Além disso, você receberá um e-mail informando sobre a disponibilidade do documento. Cabe ressaltar a importância de manter o e-mail e demais dados de contato atualizados, para que você receba esta e outras informações.',
      },
      {
        duvida: '15. Participei de um concurso público e estão me pedindo o documento físico, o que devo fazer?',
        texto:
          'É possível fazer a impressão da Representação Visual do Diploma Digital (RVDD), que não poderá ser considerada como o diploma. A representação visual do Diploma Digital não substitui o diploma digital no padrão XML podendo ser utilizado o modelo adotado pela IES para diploma em meio físico, acrescido dos mecanismos de acesso ao XML do diploma digital assinado, mas este não é do Diploma Digital. A validação dessa impressão pode ser feita pelos dispositivos de validação em meio eletrônico, quais sejam: código de validação (disponível no canto inferior direito da frente do diploma) ou QR Code (disponível no canto inferior direito do verso do diploma).',
      },
      {
        duvida: '16. Mesmo que haja pagamento de taxa extra, eu desejo meu diploma físico. Haverá essa possibilidade?',
        texto: 'Em atendimento à legislação, não haverá mais a emissão de diplomas físicos pela Instituição.',
      },
      {
        duvida: '17. Com o Diploma Digital, vai acabar a colação de grau ou não vou receber mais nada em minha colação de grau?',
        texto:
          'Não. Toda tradição ao diploma e respeito à autonomia institucional estão preservados no Diploma Digital. A colação de grau confere a outorga do título e nada muda com o Diploma Digital. O Diploma Digital terá uma Representação Visual do Diploma Digital (RVDD) que, apesar de não ser o diploma, terá as mesmas características do diploma físico que você conhece e que sua instituição adota. A diferença é que esta representação visual terá dois mecanismos para fazer essa ligação do mundo real para o virtual. Além disso, está garantido a IES o uso layout e template que adotam no diploma físico na RVDD.',
      },
    ],
  };

  ngOnInit(): void {
    if ('ies' in sessionStorage) {
      this.ies = JSON.parse(sessionStorage.getItem('ies'));
    }
    for (let i = 0; i < this.faq.duvidas.length; i++) {
      this.opened.push(false);
    }
    this.buscaForm = this.formBuilder.group({
      instituicao: ['', Validators.required],
      nome: ['', Validators.required],
    });
  }

  open(i: number): void {
    this.opened[i] = !this.opened[i];
  }

  clicouPesquisar(i: number): void {
    document.getElementById('texto-topo').classList.add('remove-texto');
    document.getElementById('subtexto-topo').classList.add('remove-texto');
    this.pesquisarTipo[i] = !this.pesquisarTipo[i];
    this.indexBotao = i;
    this.botaoVoltar = true;
  }

  clicouVoltar(): void {
    document.getElementById('texto-topo').classList.remove('remove-texto');
    document.getElementById('subtexto-topo').classList.remove('remove-texto');
    this.indexBotao = null;
  }

  buscaDigital(codigo: string): void {
    const codigoLimpo = (codigo || '').trim();
    const estacio = codigoConsulta(codigoLimpo);
    if (estacio || DiplomaComponent.CODIGO_VALIDACAO_RE.test(codigoLimpo)) {
      this.erroDiploma = false;
      window.location.assign(`${environment.diplomaUrl}/${estacio || codigoLimpo}`);
      return;
    }
    this.spinnerFunction();
    this.isLoading = true;
    this.erroDiploma = false;
    if (codigo != null) {
      this._busca.getDiplomaDigital(codigo).subscribe(
        (res) => {
          this.diplomaDigital = res;
          this.isLoading = false;
          if (this.diplomaDigital) {
            sessionStorage.setItem('diplomaDigital', JSON.stringify(this.diplomaDigital));
            window.location.assign(`${environment.diplomaUrl}/${codigo}`);
          } else {
            this.erroDiploma = true;
          }
        },
        () => {
          this.isLoading = false;
          this.erroDiploma = true;
        }
      );
    }
  }

  spinnerFunction(): void {
    this.spinner.show();
    setTimeout(() => {
      this.spinner.hide();
    }, 2000);
  }
}
