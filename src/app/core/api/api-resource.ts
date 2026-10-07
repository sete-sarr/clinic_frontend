import { HttpResourceOptions, HttpResourceRequest, httpResource } from '@angular/common/http';
import { Signal, computed } from '@angular/core';

// Lecture tolérante aux erreurs d'une ressource HTTP. Avec `httpResource`, lire `value()` quand la
// requête a échoué (401, 404, 500, réseau…) LÈVE l'erreur : levée pendant le rendu, elle interrompt
// tout le cycle de détection d'Angular (application « zoneless »), y compris les autres composants
// et les fenêtres modales ouvertes, qui restent figés jusqu'au rendu suivant. Ici, `value()` renvoie
// la valeur par défaut en cas d'erreur ; l'erreur reste consultable via `error()`.
export interface ApiResource<T> {
  value: Signal<T>;
  isLoading: Signal<boolean>;
  error: Signal<unknown>;
  reload: () => boolean;
}

type RequestFn = () => string | HttpResourceRequest | undefined;

export function apiResource<T>(request: RequestFn, options: HttpResourceOptions<T, unknown> & { defaultValue: T }): ApiResource<T>;
export function apiResource<T>(request: RequestFn, options?: HttpResourceOptions<T, unknown>): ApiResource<T | undefined>;
export function apiResource<T>(request: RequestFn, options?: HttpResourceOptions<T, unknown>): ApiResource<T | undefined> {
  const resource = httpResource<T>(
    () => {
      const current = request();
      return typeof current === 'string' ? { url: current } : current;
    },
    options as HttpResourceOptions<T, unknown>,
  );
  const fallback = options?.defaultValue;
  return {
    value: computed(() => (resource.hasValue() ? resource.value() : fallback)),
    isLoading: resource.isLoading,
    error: resource.error,
    reload: () => resource.reload(),
  };
}
