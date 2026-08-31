import { httpResource } from '@angular/common/http';
import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../../environments/environment';
import {
  EMPTY_SEARCH_RESULTS,
  GlobalSearchResults,
  SEARCH_GROUP_LABELS,
  SearchResultItem,
} from './global-search.model';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

@Component({
  selector: 'app-global-search',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './global-search.html',
  styleUrl: './global-search.css',
})
export class GlobalSearch {
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly queryInput = signal('');
  private readonly submittedQuery = signal('');
  protected readonly panelOpen = signal(false);
  private debounceHandle?: ReturnType<typeof setTimeout>;

  protected readonly resultsResource = httpResource<GlobalSearchResults>(
    () =>
      this.submittedQuery().length >= MIN_QUERY_LENGTH
        ? { url: `${environment.apiBaseUrl}/search/`, params: { q: this.submittedQuery() } }
        : undefined,
    { defaultValue: EMPTY_SEARCH_RESULTS },
  );

  protected readonly groups = Object.keys(SEARCH_GROUP_LABELS) as (keyof GlobalSearchResults)[];
  protected readonly groupLabel = SEARCH_GROUP_LABELS;

  protected readonly hasResults = () => {
    const results = this.resultsResource.value();
    return this.groups.some((group) => results[group].length > 0);
  };

  @HostListener('document:keydown.escape')
  protected closePanel(): void {
    this.panelOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.panelOpen.set(false);
    }
  }

  protected resultsFor(group: keyof GlobalSearchResults): SearchResultItem[] {
    return this.resultsResource.value()[group];
  }

  protected onInput(value: string): void {
    this.queryInput.set(value);
    this.panelOpen.set(true);
    clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => this.submittedQuery.set(value.trim()), SEARCH_DEBOUNCE_MS);
  }

  protected onFocus(): void {
    if (this.queryInput().length >= MIN_QUERY_LENGTH) {
      this.panelOpen.set(true);
    }
  }

  protected selectResult(result: SearchResultItem): void {
    this.panelOpen.set(false);
    this.queryInput.set('');
    this.submittedQuery.set('');
    this.router.navigate([result.route], { queryParams: result.query_params });
  }
}
