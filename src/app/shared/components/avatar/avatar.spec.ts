import { TestBed } from '@angular/core/testing';

import { Avatar } from './avatar';

// Photo si elle existe ; sinon, ou si elle ne se charge pas, image par défaut de la personne.
describe('Avatar', () => {
  function render(src: string | null) {
    const fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('src', src);
    fixture.componentRef.setInput('kind', 'doctor');
    fixture.componentRef.setInput('name', 'Sara Benali');
    fixture.detectChanges();
    return fixture;
  }

  it("affiche l'image par défaut sans photo", () => {
    const element = render(null).nativeElement as HTMLElement;
    expect(element.querySelector('img')).toBeNull();
    const placeholder = element.querySelector('.placeholder.kind-doctor');
    expect(placeholder?.getAttribute('aria-label')).toBe('Sara Benali');
  });

  it("revient à l'image par défaut si la photo ne se charge pas, puis réessaie avec une nouvelle URL", () => {
    const fixture = render('https://api.example/photos/a/');
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Sara Benali');

    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.placeholder')).not.toBeNull();

    fixture.componentRef.setInput('src', 'https://api.example/photos/b/');
    fixture.detectChanges();
    expect(element.querySelector('img')).not.toBeNull();
  });
});
