import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AiResponse } from '../../models/ai.model';
import { environment } from '../../../environments/environment'; 



@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/ai`;

  sendMessage(message: string, image?: File, history?: any[]): Observable<AiResponse> {
    const formData = new FormData();
    
    if (message) {
      formData.append('message', message);
    }
    
    if (image) {
      formData.append('image', image);
    }

    if (history && history.length > 0) {
      formData.append('history', JSON.stringify(history));
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentLocalTime = new Date().toString();
    
    formData.append('timeZone', timeZone);
    formData.append('currentTime', currentLocalTime);

    return this.http.post<AiResponse>(`${this.apiUrl}/chat`, formData);
  } 
}