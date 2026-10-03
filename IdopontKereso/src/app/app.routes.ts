import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { authGuard } from './services/auth/auth.guard';
import { Groups } from './pages/groups/groups';
import { Join } from './pages/join/join';
import { Profil } from './pages/profil/profil';
import { FindTime } from './pages/find-time/find-time';
import { LandingPage } from './pages/landing-page/landing-page';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ResetPassword } from './pages/reset-password/reset-password';
import { landingGuard } from './services/auth/landing.guard';

export const routes: Routes = [
    { path: '', component: LandingPage, canActivate: [landingGuard] },
    { path: 'home', component: Home, canActivate: [authGuard] },
    { path: 'login', component: Login },
    { path: 'register', component: Signup},
    { path: 'join/:id', component: Join},
    { path: 'find-time', component: FindTime, canActivate: [authGuard]},
    { path: 'profil', component: Profil, canActivate: [authGuard]},
    { path: 'groups', component: Groups, canActivate: [authGuard]},
    { path: 'forgot-password', component: ForgotPassword },
    { path: 'reset-password/:token', component: ResetPassword },
    { path: '**', redirectTo: '', pathMatch: 'full' }
];