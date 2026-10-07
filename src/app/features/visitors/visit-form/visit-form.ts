import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe, translate } from '@jsverse/transloco';

import { parseApiError } from '../../../core/api/api-error';
import { VISITOR_TYPES, VISITOR_TYPE_LABELS, Visit, VisitPayload, VisitTargets } from '../visitor.model';
import { VisitorService } from '../visitor.service';
import { apiResource } from '../../../core/api/api-resource';

type TargetChoice = { kind: 'admission' | 'staff'; id: number; label: string };

const EMPTY: VisitPayload = {
  visitor_name: '', visitor_phone: '', visitor_type: 'patient_visit', purpose: '',
  visited_admission: null, visited_staff: null, visited_free_text: '',
};

// Saisie rapide d'une entrée (ou correction le jour même) : nom, téléphone facultatif, type,
// motif, personne visitée — patient hospitalisé, membre du personnel ou texte libre.
@Component({
  selector: 'app-visit-form',
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslocoPipe,
  ],
  templateUrl: './visit-form.html',
  styleUrl: './visit-form.css',
})
export class VisitForm implements OnInit {
  private readonly visitorService = inject(VisitorService);

  readonly visit = input<Visit | null>(null);
  readonly saved = output<Visit>();
  readonly cancelled = output<void>();

  protected readonly types = VISITOR_TYPES;
  protected readonly typeLabels = VISITOR_TYPE_LABELS;

  protected readonly model = signal<VisitPayload>({ ...EMPTY });
  protected readonly target = signal<TargetChoice | null>(null);
  protected readonly targetText = signal('');
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly targetsResource = apiResource<VisitTargets>(
    () => ({ url: this.visitorService.targetsUrl, params: { search: this.targetText() } }),
    { defaultValue: { admissions: [], staff: [] } },
  );
  protected readonly isEdit = computed(() => this.visit() !== null);

  ngOnInit(): void {
    const visit = this.visit();
    if (visit) {
      this.model.set({
        visitor_name: visit.visitor_name, visitor_phone: visit.visitor_phone, visitor_type: visit.visitor_type,
        purpose: visit.purpose, visited_admission: visit.visited_admission, visited_staff: visit.visited_staff,
        visited_free_text: visit.visited_free_text,
      });
      this.targetText.set(visit.visited_display);
      if (visit.visited_admission || visit.visited_staff) {
        this.target.set({
          kind: visit.visited_admission ? 'admission' : 'staff',
          id: (visit.visited_admission ?? visit.visited_staff)!,
          label: visit.visited_display,
        });
      }
    }
  }

  protected set<K extends keyof VisitPayload>(key: K, value: VisitPayload[K]): void {
    this.model.update((current) => ({ ...current, [key]: value }));
  }

  protected onTargetInput(text: string): void {
    this.targetText.set(text);
    this.target.set(null);
  }

  protected onTargetSelected(choice: TargetChoice): void {
    this.target.set(choice);
    this.targetText.set(choice.label);
  }

  protected displayTarget = (value: TargetChoice | string | null): string =>
    typeof value === 'string' ? value : (value?.label ?? '');

  protected submit(): void {
    const value = this.model();
    if (!value.visitor_name.trim() || !value.purpose.trim()) {
      this.error.set(translate('visitors.required'));
      return;
    }
    const target = this.target();
    const payload: VisitPayload = {
      ...value,
      visited_admission: target?.kind === 'admission' ? target.id : null,
      visited_staff: target?.kind === 'staff' ? target.id : null,
      visited_free_text: target ? '' : this.targetText().trim(),
    };
    const visit = this.visit();
    const request$ = visit ? this.visitorService.update(visit.id, payload) : this.visitorService.checkIn(payload);
    this.pending.set(true);
    this.error.set(null);
    request$.subscribe({
      next: (saved) => {
        this.pending.set(false);
        if (!visit) {
          this.model.set({ ...EMPTY });
          this.target.set(null);
          this.targetText.set('');
        }
        this.saved.emit(saved);
      },
      error: (error) => {
        this.pending.set(false);
        this.error.set(parseApiError(error, translate('visitors.saveError')).message);
      },
    });
  }
}
