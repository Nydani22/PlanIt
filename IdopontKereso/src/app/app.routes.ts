import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { authGuard } from './services/auth/auth.guard';
import { Groups } from './pages/groups/groups';
import { JoinComponent } from './components/join/join';

export const routes: Routes = [
    { path: '', component: Home, canActivate: [authGuard] },
    { path: 'login', component: Login },
    { path: 'register', component: Signup},
    { path: 'join/:id', component: JoinComponent, canActivate: [authGuard]},
    { path: 'groups', component: Groups, canActivate: [authGuard]},
    { path: '**', redirectTo: '', pathMatch: 'full' }
];