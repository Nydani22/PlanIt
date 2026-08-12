import { Component, inject, signal, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AiService } from '../../services/ai/ai.service';
import { ChatMessage } from '../../models/ai.model';
import { CalendarRefreshService } from '../../services/calendarRefresh/calendar-refresh.service';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatButtonModule, 
    MatIconModule, 
    MatInputModule, 
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MarkdownModule
  ],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss']
})
export class AiChatComponent {
  private aiService = inject(AiService);
  private calendarRefreshService = inject(CalendarRefreshService);
  private snackbarService = inject(SnackbarService);

  messages = signal<ChatMessage[]>([
    { sender: 'ai', text: 'Szia! Miben segíthetek? Tölts fel egy képet egy meghívóról vagy órarendről, vagy csak írd le az időpontot, és beírom a naptáradba!' }
  ]);
  
  userInput = signal('');
  selectedFile = signal<File | null>(null);
  selectedFilePreview = signal<string | null>(null);
  isLoading = signal(false);
  isOpen = signal(false);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  isRecording = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];



  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.selectedFilePreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    
    if (this.isOpen()) {
      this.scrollToBottom();
    }
  }

  removeFile() {
    this.selectedFile.set(null);
    this.selectedFilePreview.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        
        if (file) {
          this.selectedFile.set(file);
          
          const reader = new FileReader();
          reader.onload = (e) => this.selectedFilePreview.set(e.target?.result as string);
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }

  sendMessage() {
    const text = this.userInput().trim();
    const file = this.selectedFile();

    if (!text && !file) return;

    const recentHistory = this.messages()
      .slice(-6)
      .map(msg => ({
        role: msg.sender,
        content: msg.text || ''
      }));

    this.messages.update(msgs => [...msgs, { 
      sender: 'user', 
      text: text, 
      imageUrl: this.selectedFilePreview() || undefined 
    }]);

    this.userInput.set('');
    this.removeFile();
    this.isLoading.set(true);
    this.scrollToBottom();

    this.aiService.sendMessage(text, file || undefined, recentHistory).subscribe({
      next: (res) => {
        this.messages.update(msgs => [...msgs, { sender: 'ai', text: res.message }]);
        this.isLoading.set(false);
        this.scrollToBottom();
        
        if (res.action === 'createEvent' || res.action === 'updateEvent' || res.action === 'deleteEvent') {
          this.calendarRefreshService.triggerRefresh();
        }
      },
      error: (err) => {
        this.messages.update(msgs => [...msgs, { sender: 'ai', text: 'Hiba történt a kapcsolódás során. Kérlek próbáld újra!' }]);
        this.isLoading.set(false);
        this.scrollToBottom();
      }
    });
  }

  private async startRecording() {
    try {
      // 1. Elkérjük a mikrofon engedélyt a böngészőtől
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      // 2. Gyűjtjük a hangadatokat, ahogy beszél a felhasználó
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // 3. Amikor leállítjuk a felvételt, fájlt csinálunk belőle
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        // Fájllá alakítjuk, hogy a meglévő Service tudja kezelni
        const audioFile = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });
        
        // Azonnal elküldjük az AI-nak
        this.sendAudioMessage(audioFile);
        
        // Kikapcsoljuk a mikrofont (eltűnik a piros pötty a böngésző tabról)
        stream.getTracks().forEach(track => track.stop());
      };

      // Indítjuk a felvételt
      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch (err) {
      console.error('Mikrofon hiba:', err);
      this.snackbarService.showError('Nem sikerült hozzáférni a mikrofonhoz!');
    }
  }

  private stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
    }
  }

  // ÚJ FÜGGVÉNY: Kifejezetten a hangfájl beküldésére
  private sendAudioMessage(audioFile: File) {
    // Kiírjuk a chaten, hogy elment egy hangüzenet
    this.messages.update(msgs => [...msgs, { 
      sender: 'user', 
      text: '🎤 Hangüzenet elküldve...' 
    }]);

    this.isLoading.set(true);
    this.scrollToBottom();

    const recentHistory = this.messages()
      .slice(-6)
      .map(msg => ({
        role: msg.sender,
        content: msg.text || ''
      }));

    // A meglévő AiService-t használjuk! Bár a paraméter neve 'image' a service-ben,
    // valójában bármilyen fájlt (így hangot is) tökéletesen átvisz a backendig!
    this.aiService.sendMessage('', audioFile, recentHistory).subscribe({
      next: (res) => {
        this.messages.update(msgs => [...msgs, { sender: 'ai', text: res.message }]);
        this.isLoading.set(false);
        this.scrollToBottom();
        
        if (res.action === 'createEvent' || res.action === 'updateEvent' || res.action === 'deleteEvent') {
          this.calendarRefreshService.triggerRefresh();
        }
      },
      error: (err) => {
        this.messages.update(msgs => [...msgs, { sender: 'ai', text: 'Hiba történt a kapcsolódás során. Kérlek próbáld újra!' }]);
        this.isLoading.set(false);
        this.scrollToBottom();
      }
    });
  }

  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private scrollToBottom() {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }
}