import { HttpErrorResponse } from '@angular/common/http';

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
    return 'Serveur injoignable : vérifiez votre connexion internet puis réessayez.';
  }
  if (status === 401) {
    return 'Votre session a expiré : reconnectez-vous puis réessayez (erreur 401).';
  }
  if (status === 403) {
    return "Vous n'avez pas les droits nécessaires pour cette action (erreur 403).";
  }
  if (status === 404) {
    return "Ce service n'est pas disponible sur le serveur : contactez l'administrateur (erreur 404).";
  }
  if (status === 408 || status === 504) {
    return `Le serveur a mis trop de temps à répondre : réessayez dans quelques instants (erreur ${status}).`;
  }
  if (status === 413) {
    return 'Les données envoyées sont trop volumineuses (erreur 413).';
  }
  if (status === 429) {
    return 'Trop de requêtes : patientez quelques instants avant de réessayer (erreur 429).';
  }
  if (status >= 500) {
    return `Erreur interne du serveur : réessayez plus tard ou contactez l'administrateur (erreur ${status}).`;
  }
  return `Erreur inattendue (erreur ${status}).`;
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
