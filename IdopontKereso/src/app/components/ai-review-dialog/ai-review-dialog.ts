import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventService } from '../../services/event/event.service';
import { SnackbarService } from '../../services/snackbar/snackbar.service';
import { EventDialogComponent } from '../event-dialog/event-dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog';
import { firstValueFrom } from 'rxjs';
import { AppEvent } from '../../models/event.model';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-ai-review-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './ai-review-dialog.html'
})
export class AiReviewDialogComponent implements OnInit {
  private dialog = inject(MatDialog);
  private eventService = inject(EventService);
  private snackbarService = inject(SnackbarService);
  
  @Input() data: any;
  
  @Output() closeDialog = new EventEmitter<boolean>();
  
  creations = signal<any[]>([]);
  updates = signal<any[]>([]);
  deletions = signal<any[]>([]);
  
  isLoading = signal(false);

  ngOnInit() {
    if (this.data) {
      this.creations.set(this.data.creations || []);
      this.updates.set(this.data.updates || []);
      this.deletions.set(this.data.deletions || []);
    }
  }

  discardItem(type: 'create' | 'update' | 'delete', index: number) {
    if (type === 'create') {
      const list = this.creations();
      list.splice(index, 1);
      this.creations.set([...list]);
    }
    if (type === 'update') {
      const list = this.updates();
      list.splice(index, 1);
      this.updates.set([...list]);
    }
    if (type === 'delete') {
      const list = this.deletions();
      list.splice(index, 1);
      this.deletions.set([...list]);
    }
    this.checkIfEmpty();
  }

  async editCreation(item: any, index: number) {
    item.fromDate = new Date(item.fromDate);
    item.toDate = new Date(item.toDate);

    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { event: item as AppEvent }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      this.discardItem('create', index); 
    }
  }

  async editUpdate(item: any, index: number) {
    item.fromDate = new Date(item.fromDate);
    item.toDate = new Date(item.toDate);
    item._id = item.eventId;

    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: true,
      data: { event: item as AppEvent }
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      this.discardItem('update', index);
    }
  }

  async confirmDeletion(item: any, index: number) {
    const confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Törlés jóváhagyása',
        message: `Az AI a(z) "${item.eventName}" eseményt törlésre jelölte. Valóban törlöd a naptáradból?`,
        confirmText: 'Törlés',
        cancelText: 'Mégsem',
        color: 'warn'
      }
    });

    const result = await firstValueFrom(confirmDialogRef.afterClosed());
    if (result) {
      this.isLoading.set(true);
      this.eventService.deleteEvent(item.eventId).subscribe({
        next: () => {
          this.discardItem('delete', index);
          this.snackbarService.showSuccess('Esemény sikeresen törölve.');
          this.isLoading.set(false);
        },
        error: () => {
          this.snackbarService.showError('Hiba a törlés során.');
          this.isLoading.set(false);
        }
      });
    }
  }

  async saveAllRemaining() {
    this.isLoading.set(true);
    try {
      for (const item of this.deletions()) {
        await firstValueFrom(this.eventService.deleteEvent(item.eventId));
      }
      for (const item of this.updates()) {
        const { eventId, ...updateData } = item;
        updateData.fromDate = new Date(updateData.fromDate);
        updateData.toDate = new Date(updateData.toDate);
        await firstValueFrom(this.eventService.updateEvent(eventId, updateData));
      }
      for (const item of this.creations()) {
        item.fromDate = new Date(item.fromDate);
        item.toDate = new Date(item.toDate);
        await firstValueFrom(this.eventService.createEvent(item));
      }
      this.closeDialog.emit(true); 
    } catch (e) {
      this.snackbarService.showError('Hiba a tömeges mentés során!');
    } finally {
      this.isLoading.set(false);
    }
  }

  close() {
    this.closeDialog.emit(false);
  }

  private checkIfEmpty() {
    if (this.creations().length === 0 && this.updates().length === 0 && this.deletions().length === 0) {
      this.closeDialog.emit(true); 
    }
  }
}