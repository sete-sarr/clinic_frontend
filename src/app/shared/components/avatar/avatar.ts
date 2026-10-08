import { Component, input, linkedSignal } from '@angular/core';

// Image par défaut selon la personne (public/avatars/, icônes Healthicons sous licence MIT).
export type AvatarKind = 'doctor' | 'patient' | 'staff';

// Photo de profil ronde (médecin, membre du personnel, patient). Sans photo, ou si elle ne se
// charge pas (URL signée expirée, réseau), affiche l'illustration par défaut de `kind`, colorée par
// les tokens du thème (masque CSS) pour rester lisible en clair comme en sombre.
@Component({
  selector: 'app-avatar',
  template: `
    @if (src() && !failed()) {
      <img [src]="src()" [alt]="name()" loading="lazy" decoding="async" (error)="failed.set(true)" />
    } @else {
      <span class="placeholder" [class]="'placeholder kind-' + kind()" role="img" [attr.aria-label]="name()"></span>
    }
  `,
  styleUrl: './avatar.css',
  host: { '[style.--avatar-size.px]': 'size()' },
})
export class Avatar {
  readonly src = input<string | null | undefined>(null);
  readonly kind = input.required<AvatarKind>();
  readonly name = input('');
  readonly size = input(40);

  // Réinitialisé à chaque nouvelle URL.
  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });
}
