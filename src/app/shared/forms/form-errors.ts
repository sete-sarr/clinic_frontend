import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { MatInput } from '@angular/material/input';

interface FieldStateLike {
  touched(): boolean;
  invalid(): boolean;
}

// Champ de recherche avec autocomplétion (patient…) : il affiche un libellé alors que le formulaire
// stocke un identifiant, il n'est donc pas lié par [formField]. Angular Material ne calcule l'état
// d'erreur d'un champ que s'il est lié à un contrôle de formulaire : sans cette directive, « Patient
// requis » ne s'affiche jamais et l'enregistrement est refusé sans explication.
// Usage : <input matInput [appFieldErrorState]="monForm.patient()" …>
@Directive({ selector: 'input[matInput][appFieldErrorState]' })
export class FieldErrorState {
  readonly appFieldErrorState = input.required<FieldStateLike>();
  private readonly matInput = inject(MatInput);

  constructor() {
    effect(() => {
      const state = this.appFieldErrorState();
      const hasError = state.touched() && state.invalid();
      if (this.matInput.errorState !== hasError) {
        this.matInput.errorState = hasError;
        this.matInput.stateChanges.next();
      }
    });
  }
}

// À appeler juste avant submit() : si l'enregistrement est refusé, fait défiler la fenêtre jusqu'au
// premier champ en erreur et y place le curseur (le champ manquant peut être hors de l'écran, en haut
// d'une longue fenêtre). Sans effet si le formulaire est valide.
// `unboundFields` : champs sans [formField] (recherche de patient…), que submit() ne marque pas
// « touchés » — leur erreur ne s'afficherait pas sans cela.
export function revealFirstError(host: ElementRef<HTMLElement>, ...unboundFields: { markAsTouched(): void }[]): void {
  unboundFields.forEach((field) => field.markAsTouched());
  setTimeout(() => {
    const field = host.nativeElement.querySelector<HTMLElement>('.mat-form-field-invalid');
    if (!field) {
      return;
    }
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.querySelector<HTMLElement>('input, textarea, mat-select')?.focus({ preventScroll: true });
  }, 100);
}
