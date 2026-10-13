import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { MainComponent } from './pages/main/main.component';
import { DiplomaComponent } from './pages/diploma/diploma.component';
import { ConformidadeComponent } from './pages/conformidade/conformidade.component';
import { LoginComponent } from './pages/login/login.component';

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'login', component: LoginComponent },
  { path: 'diploma/:id', component: DiplomaComponent },
  { path: 'conformidade', component: ConformidadeComponent },
  { path: 'conformidade/:id', component: ConformidadeComponent },
  { path: '**', pathMatch: 'full', redirectTo: '' },
];

@NgModule({
  imports: [CommonModule, RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
