import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type AcessoOnline = {
  matricula?: string;
  senhaHash?: string;
  nome?: string;
  pubId?: string;
  url?: string;
};

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);

  bannerAberto = true;
  dataFormatada = '';
  matricula = '';
  senha = '';
  mostrarSenha = false;
  verificado = false;
  validando = false;
  mensagem = '';
  enviando = false;
  private verificacaoTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const hoje = new Date();
    const semana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    this.dataFormatada = `${semana[hoje.getDay()]}, ${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  }

  ngOnDestroy(): void {
    clearTimeout(this.verificacaoTimer);
  }

  aviso(texto: string) {
    this.mensagem = texto;
  }

  marcarVerificacao(): void {
    if (this.validando) return;
    if (this.verificado) {
      this.verificado = false;
      return;
    }
    this.validando = true;
    this.verificado = false;
    clearTimeout(this.verificacaoTimer);
    this.verificacaoTimer = setTimeout(() => {
      this.validando = false;
      this.verificado = true;
    }, 3000);
  }

  async entrar() {
    const usuario = this.matricula.trim();
    if (!usuario || !this.senha) {
      this.aviso('Informe a matrícula e a senha.');
      return;
    }
    this.enviando = true;
    this.mensagem = '';
    try {
      const lista = await this.carregarAcessos();
      const hash = await sha256(this.senha);
      const acesso = lista.find(a =>
        String(a.matricula || '').toLowerCase() === usuario.toLowerCase() && a.senhaHash === hash
      );
      if (!acesso) {
        this.aviso('Usuário ou senha inválidos.');
        return;
      }
      const destino = acesso.pubId
        ? `${environment.diplomaUrl}/${acesso.pubId}`
        : (acesso.url || '');
      if (destino) {
        window.location.href = destino;
        return;
      }
      this.aviso('Este acesso não tem um diploma vinculado.');
    } catch {
      this.aviso('Não foi possível verificar o acesso agora. Tente de novo.');
    } finally {
      this.enviando = false;
    }
  }

  private carregarAcessos(): Promise<AcessoOnline[]> {
    const url = `${environment.supabaseUrl}/storage/v1/object/public/diplomas/estacio/acessos.json?v=${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.http.get<AcessoOnline[]>(url).subscribe({
        next: (lista) => resolve(Array.isArray(lista) ? lista : []),
        error: (err) => {
          const status = err?.status;
          if (status === 400 || status === 404) resolve([]);
          else reject(err);
        },
      });
    });
  }
}

async function sha256(texto: string): Promise<string> {
  const data = new TextEncoder().encode(texto);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
