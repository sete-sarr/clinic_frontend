import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { translate } from '@jsverse/transloco';

// Libellés de la pagination des tableaux dans la langue de l'interface (docs/i18n.md) — sans ceci,
// Angular Material affiche « Items per page », « 1 – 10 of 42 » quelle que soit la langue.
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = translate('paginator.itemsPerPage');
  override nextPageLabel = translate('paginator.nextPage');
  override previousPageLabel = translate('paginator.previousPage');
  override firstPageLabel = translate('paginator.firstPage');
  override lastPageLabel = translate('paginator.lastPage');

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return translate('paginator.rangeEmpty', { length });
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return translate('paginator.range', { start: start + 1, end, length });
  };
}
