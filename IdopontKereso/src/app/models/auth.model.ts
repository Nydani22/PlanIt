import { User } from "./user.model";

export interface RegisterData {
  userName: string;
  fullName: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string; 
  user?: User;
}