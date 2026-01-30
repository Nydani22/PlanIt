import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';

export const routes: Routes = [
    {path: '', component: Home},
    {path: 'login', component: Login},
    {path: 'register', component: Signup},
    {path: '**', redirectTo: '', pathMatch:"full"}
];
