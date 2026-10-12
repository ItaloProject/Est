import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { BuscaService } from '../../services/busca.service';

@Component({
  selector: 'busca',
  standalone: false,
  templateUrl: './busca.component.html',
  styleUrls: ['./busca.component.scss'],
})
export class BuscaComponent implements OnInit {
  private _formBuilder = inject(FormBuilder);
  private spinner = inject(NgxSpinnerService);
  private _busca = inject(BuscaService);

  @Input() ies: any;
  isCollapsed = true;
  captcha = '';
  instituicoes: any[];
  resultadosBusca: any;

  buscaForm = this._formBuilder.group({
    Instituicao: ['Selecione uma instituição', Validators.required],
    Nome: ['', Validators.required],
    Captcha: ['', Validators.required],
  });

  ngOnInit(): void {
    this.generateCaptcha();
    this._busca.getInstituicao(this.ies.codigo).subscribe(
      (res) => {
        const lista = res.listarTodasInstituicoesEnsinoResult.instituicaoEnsinoDTO;
        if (lista.length > 0) {
          this.instituicoes = lista.sort((a, b) => (a.nome > b.nome ? 1 : -1));
          if (lista.length == 1) {
            this.buscaForm.controls.Instituicao.setValue(lista[0].codInstituicao);
          }
        }
      },
      (err) => {
        console.log(err);
      }
    );
  }

  generateCaptcha(): void {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    let tamanho = 4;
    let captcha = '';
    while (tamanho--) {
      if (this.rand(2) === 0) {
        captcha += letras[this.rand(letras.length)];
      } else {
        captcha += numeros[this.rand(numeros.length)];
      }
    }
    this.captcha = captcha;
  }

  rand(max: number): number {
    return Math.floor(Math.random() * max);
  }

  buscar(pageSize: number, pageNumber: number, event?: Event): void {
    this.spinnerFunction();
    setTimeout(() => {
      if (event) {
        event.preventDefault();
      }
      if (this.validacao()) {
        const body = {
          codCurso: null,
          codInstituicaoEnsino: parseInt(this.buscaForm.controls.Instituicao.value),
          nomeAluno: this.buscaForm.controls.Nome.value,
          numRegistroDiploma: null,
        };
        this._busca.getResultado(body, pageSize, pageNumber).subscribe(
          (res) => {
            this.resultadosBusca = res;
            setTimeout(() => {
              document.getElementById('Resultado').scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            }, 250);
            this.isCollapsed = false;
          },
          (err) => {
            console.log(err);
          }
        );
      } else {
        return;
      }
    }, 1000);
  }

  pageChanged(event: { page: number; itemsPerPage: number }): void {
    this.buscar(event.itemsPerPage, event.page);
  }

  validacao(): boolean {
    const erroInstituicao = document.getElementById('error-message-instituicao');
    const erroNome = document.getElementById('error-message-nome');
    const erroCaptcha = document.getElementById('error-message-captcha');
    const inputInstituicao = document.getElementById('input-instituicao');
    const inputNome = document.getElementById('input-nome');
    const inputCaptcha = document.getElementById('input-captcha');

    erroInstituicao.style.display = 'none';
    erroNome.style.display = 'none';
    erroCaptcha.style.display = 'none';
    inputInstituicao.style.boxShadow = 'none';
    inputNome.style.boxShadow = 'none';
    inputCaptcha.style.boxShadow = 'none';

    if (this.captcha == this.buscaForm.controls.Captcha.value) {
      if (this.buscaForm.controls.Instituicao.value === 'Selecione uma instituição') {
        erroInstituicao.style.display = 'block';
        erroInstituicao.innerHTML = 'Selecione uma instituição';
        erroInstituicao.classList.add('hasError', 'hasErrorInstituicao');
        inputInstituicao.style.boxShadow = '0 0 5px red';
      }
      return !!this.buscaForm.controls.Nome.value;
    }

    erroCaptcha.style.display = 'block';
    erroCaptcha.innerHTML = 'Captcha incorreto!';
    erroCaptcha.style.color = 'red';
    erroCaptcha.classList.add('hasError');
    inputCaptcha.style.boxShadow = '0 0 5px red';
    return false;
  }

  spinnerFunction(): void {
    this.spinner.show();
    setTimeout(() => {
      this.spinner.hide();
    }, 2000);
  }
}
