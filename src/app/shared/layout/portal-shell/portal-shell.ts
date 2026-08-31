import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

// The whole shell is patient-only (guarded by roleGuard('patient') in app.routes.ts), so — unlike
// the staff Shell — there is no per-item role filtering here.
const NAV_ITEMS: NavItem[] = [
  { label: 'Mes rendez-vous', icon: 'event', route: '/portal/appointments' },
  { label: 'Mes prescriptions', icon: 'description', route: '/portal/prescriptions' },
  { label: 'Mes factures', icon: 'receipt_long', route: '/portal/invoices' },
  { label: 'Mon dossier médical', icon: 'folder_shared', route: '/portal/medical-record' },
];

@Component({
  selector: 'app-portal-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  templateUrl: './portal-shell.html',
  styleUrl: './portal-shell.css',
})
export class PortalShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly user = this.auth.user;
  protected readonly navItems = NAV_ITEMS;

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
