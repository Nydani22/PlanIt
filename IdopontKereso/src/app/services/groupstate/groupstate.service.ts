import { Injectable, signal, computed, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { Group } from '../../models/group.model';
import { GroupService } from '../group/group.service';

@Injectable({
  providedIn: 'root'
})
export class GroupStateService {
  private groupService = inject(GroupService);

  myGroups = signal<Group[]>([]);
  searchQuery = signal<string>('');
  selectedGroupId = signal<string>('');
  isLoading = signal<boolean>(true);

  private openCreateModalSource = new Subject<void>();
  openCreateModal$ = this.openCreateModalSource.asObservable();

  filteredGroups = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.myGroups();
    
    return this.myGroups().filter(g => 
      g.groupName.toLowerCase().includes(query)
    );
  });

  loadGroups() {
    this.isLoading.set(true);
    this.groupService.getGroups().subscribe({
      next: (data) => {
        this.myGroups.set(data);
        this.isLoading.set(false);
        
        if (data.length > 0) {
          const currentSelected = this.selectedGroupId();
          const exists = data.some(g => g._id === currentSelected);
          if (!currentSelected || !exists) {
            this.selectedGroupId.set(data[0]._id);
          }
        } else {
          this.selectedGroupId.set('');
        }
      },
      error: (err) => {
        console.error('Hiba a csoportok lekérésekor', err);
        this.isLoading.set(false);
      }
    });
  }

  triggerCreateModal() {
    this.openCreateModalSource.next();
  }
}