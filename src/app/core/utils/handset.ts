import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

// true sur téléphone (même point d'arrêt que la barre latérale, shell.ts) : les listes y affichent
// des cartes (app-record-card) au lieu d'un tableau. À appeler dans un contexte d'injection.
export function injectIsHandset(): Signal<boolean> {
  return toSignal(inject(BreakpointObserver).observe(Breakpoints.Handset).pipe(map((result) => result.matches)), {
    initialValue: false,
  });
}
