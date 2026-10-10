import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';

import { translocoTesting } from '../../../core/i18n/transloco-testing';
import { BottomNav, BottomNavTab } from './bottom-nav';

@Component({ template: '' })
class Blank {}

// Barre du bas : un lien par onglet, onglet de la page courante marqué (classe + aria-current),
// pastille du compteur, « Plus » qui demande l'ouverture du menu latéral.
describe('BottomNav', () => {
  const tabs: BottomNavTab[] = [
    { labelKey: 'nav.dashboard', icon: 'dashboard', route: '/dashboard' },
    { labelKey: 'notifications.title', icon: 'notifications', route: '/notifications', badge: 3 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTesting('fr')],
      providers: [
        provideRouter([
          { path: 'dashboard', component: Blank },
          { path: 'notifications', component: Blank },
        ]),
      ],
    });
  });

  async function render() {
    await RouterTestingHarness.create('/notifications');
    const fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput('tabs', tabs);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('affiche les onglets, marque la page courante et le compteur', async () => {
    const element = (await render()).nativeElement as HTMLElement;
    const links = element.querySelectorAll('a.tab');
    expect(links.length).toBe(2);
    expect(links[1].classList).toContain('active');
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(element.querySelector('.tab-badge')?.textContent?.trim()).toBe('3');
    expect(element.textContent).toContain('Plus');
  });

  it('« Plus » demande l’ouverture du menu', async () => {
    const fixture = await render();
    let opened = false;
    fixture.componentInstance.more.subscribe(() => (opened = true));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button.tab')!.click();
    expect(opened).toBe(true);
  });
});
