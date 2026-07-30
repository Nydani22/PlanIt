import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { authGuard } from './services/auth/auth.guard';
import { Groups } from './pages/groups/groups';
import { Join } from './pages/join/join';
import { Profil } from './pages/profil/profil';
import { FindTime } from './pages/find-time/find-time';

export const routes: Routes = [
    { path: '', component: Home, canActivate: [authGuard] },
    { path: 'login', component: Login },
    { path: 'register', component: Signup},
    { path: 'join/:id', component: Join},
    {path: 'find-time', component: FindTime, canActivate: [authGuard]},
    { path: 'profil', component: Profil, canActivate: [authGuard]},
    { path: 'groups', component: Groups, canActivate: [authGuard]},
    { path: '**', redirectTo: '', pathMatch: 'full' }
];