import { Component, inject, ViewChild, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CalendarViewComponent } from "../../components/calendar-view/calendar-view";
import { CalendarRefreshService } from '../../services/calendarRefresh/calendar-refresh.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CalendarViewComponent],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  @ViewChild(CalendarViewComponent) calendar!: CalendarViewComponent;

  private refreshService = inject(CalendarRefreshService);
  private refreshSub!: Subscription;

  ngOnInit() {
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      if (this.calendar) {
        this.calendar.loadEvents();
      }
    });
  }

  ngOnDestroy() {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
    }
  }
}