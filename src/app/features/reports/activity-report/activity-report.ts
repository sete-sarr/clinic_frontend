import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';

import { parseApiError } from '../../../core/api/api-error';
import { toIsoDate } from '../../../core/utils/date';
import { openBlobInNewTab } from '../../../core/utils/file-download';
import { ReportsService } from '../reports.service';

interface ActivityReportFormModel {
  dateFrom: Date | null;
  dateTo: Date | null;
}

@Component({
  selector: 'app-activity-report',
  imports: [
    FormField,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './activity-report.html',
  styleUrl: './activity-report.css',
})
export class ActivityReport {
  private readonly reportsService = inject(ReportsService);

  protected readonly today = new Date();

  protected readonly model = signal<ActivityReportFormModel>({ dateFrom: null, dateTo: null });

  protected readonly reportForm = form(this.model);

  protected async onSubmit(): Promise<void> {
    await submit(this.reportForm, async () => {
      try {
        const { dateFrom, dateTo } = this.model();
        const blob = await firstValueFrom(
          this.reportsService.downloadActivityReport(
            dateFrom ? toIsoDate(dateFrom) : null,
            dateTo ? toIsoDate(dateTo) : null,
          ),
        );
        openBlobInNewTab(blob);
        return undefined;
      } catch (error) {
        const { message } = parseApiError(error, 'Génération du rapport impossible. Réessayez dans un instant.');
        return [{ kind: 'server', message }];
      }
    });
  }
}
