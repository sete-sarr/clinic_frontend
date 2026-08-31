import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  host: { class: 'app-empty-state' },
})
export class EmptyState {
  readonly icon = input.required<string>();
  readonly message = input.required<string>();
  readonly padded = input(true);
}
