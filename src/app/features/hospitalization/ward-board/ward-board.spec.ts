import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { translocoTesting } from '../../../core/i18n/transloco-testing';
import { Bed } from '../hospitalization.model';
import { WardBoard } from './ward-board';

function bed(id: number, room: string, department: string, status: Bed['status'], patient?: string): Bed {
  return {
    id, label: `L${id}`, status, room: Number(room), room_number: room, room_type_name: 'Double',
    department: department === 'Médecine' ? 1 : 2, department_name: department, is_active: true,
    current_stay: patient ? { id: 10 + id, number: `HOS-2026-0000${id}`, patient_display: patient } : null,
  };
}

// Tableau d'occupation : regroupement service → chambre → lits, compteurs par statut et libellé
// de statut toujours affiché (jamais la couleur seule).
describe('WardBoard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTesting('fr')],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    });
  });

  it('regroupe les lits et compte les statuts', async () => {
    const fixture = TestBed.createComponent(WardBoard);
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/hospitalization/beds/board/`)
      .flush([
        bed(1, '101', 'Médecine', 'occupied', 'Grace Hopper (PAT-1)'),
        bed(2, '101', 'Médecine', 'free'),
        bed(3, '201', 'Chirurgie', 'cleaning'),
      ]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.tick();

    const element: HTMLElement = fixture.nativeElement;
    const departments = [...element.querySelectorAll('.department-title')].map((node) => node.textContent?.trim());
    expect(departments).toEqual(['Médecine', 'Chirurgie']);
    const counts = [...element.querySelectorAll('.summary-count')].map((node) => node.textContent?.trim());
    expect(counts).toEqual(['1', '1', '1', '0']);
    expect(element.textContent).toContain('Grace Hopper (PAT-1)');
    expect(element.textContent).toContain('En nettoyage');
  });
});
