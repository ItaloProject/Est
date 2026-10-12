import { NgModule, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { AlertModule } from 'ngx-bootstrap/alert';
import {
  NgxBootstrapIconsModule,
  chevronDown,
  chevronUp,
  arrowRightShort,
  checkCircleFill,
  xCircleFill,
  exclamationTriangleFill,
  cloudArrowUp,
  trash,
} from 'ngx-bootstrap-icons';
import { NgxSpinnerModule } from 'ngx-spinner';
import { provideNgxMask, NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';
import { PdfViewerModule } from 'ng2-pdf-viewer';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainComponent } from './pages/main/main.component';
import { DiplomaComponent } from './pages/diploma/diploma.component';
import { ConformidadeComponent } from './pages/conformidade/conformidade.component';
import { BuscaComponent } from './components/busca/busca.component';
import { CardBuscaComponent } from './components/card-busca/card-busca.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { DadosComponent } from './components/dados/dados.component';
import { SexoEStatusPipe } from './pipes/sexo-e-status.pipe';

registerLocaleData(localePt);

const icons = {
  chevronDown,
  chevronUp,
  arrowRightShort,
  checkCircleFill,
  xCircleFill,
  exclamationTriangleFill,
  cloudArrowUp,
  trash,
};

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    DiplomaComponent,
    ConformidadeComponent,
    BuscaComponent,
    CardBuscaComponent,
    NavbarComponent,
    DadosComponent,
    SexoEStatusPipe,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    AccordionModule,
    CollapseModule,
    NgxBootstrapIconsModule.pick(icons),
    PaginationModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    AlertModule,
    NgxSpinnerModule.forRoot(),
    PdfViewerModule,
    NgxMaskDirective,
    NgxMaskPipe,
  ],
  providers: [
    provideZoneChangeDetection(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideNgxMask(),
    provideHttpClient(withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
