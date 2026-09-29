import { HttpErrorResponse } from '@angular/common/http';
import { translate } from '@jsverse/transloco';

// Reflète common.exceptions.api_exception_handler (docs/api-guidelines.md
// "Standardized errors: code, message, field when relevant").
export interface ApiError {
  code: number;
  message: string;
  field: string | null;
}

function isApiErrorShape(value: unknown): value is ApiError {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>)['message'] === 'string'
  );
}

// Réponses qui n'ont pas la forme ApiError (page HTML de l'hébergeur, réseau coupé, proxy) :
// on précise la cause probable au lieu de laisser le seul message générique, qui ne permet ni à
// l'utilisateur ni au support de distinguer un endpoint non déployé d'une panne serveur.
function describeHttpFailure(status: number): string {
  if (status === 0) {
    return translate('httpErrors.unreachable');
  }
  if (status === 401) {
    return translate('httpErrors.sessionExpired');
  }
  if (status === 403) {
    return translate('httpErrors.forbidden');
  }
  if (status === 404) {
    return translate('httpErrors.notFound');
  }
  if (status === 408 || status === 504) {
    return translate('httpErrors.timeout', { status });
  }
  if (status === 413) {
    return translate('httpErrors.tooLarge');
  }
  if (status === 429) {
    return translate('httpErrors.tooManyRequests');
  }
  if (status >= 500) {
    return translate('httpErrors.serverError', { status });
  }
  return translate('httpErrors.unexpected', { status });
}

export function parseApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof HttpErrorResponse && isApiErrorShape(error.error)) {
    return error.error;
  }
  if (error instanceof HttpErrorResponse) {
    return {
      code: error.status,
      message: `${fallbackMessage} ${describeHttpFailure(error.status)}`,
      field: null,
    };
  }
  return { code: 0, message: fallbackMessage, field: null };
}
