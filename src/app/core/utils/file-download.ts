import { isTauri } from '@tauri-apps/api/core';

// Les exports CSV portent un nom de fichier Content-Disposition: attachment — une simple URL blob
// via window.open() l'ignore, donc le fichier a besoin d'un <a download> synthétique pour être
// enregistré sous le bon nom.
//
// Dans l'application de bureau (Tauri), la webview n'honore ni <a download> ni window.open() sur une
// URL blob : on passe alors par les plugins natifs (boîte « Enregistrer sous », écriture disque,
// ouverture dans l'application par défaut). Les plugins sont chargés en import() dynamique pour ne
// rien ajouter au bundle initial de la version web.
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (isTauri()) {
    void saveBlobNatively(blob, filename).catch((error) => console.error(error));
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function openBlobInNewTab(blob: Blob, filename = 'document.pdf'): void {
  if (isTauri()) {
    void openBlobNatively(blob, filename).catch((error) => console.error(error));
    return;
  }
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function saveBlobNatively(blob: Blob, filename: string): Promise<void> {
  const [{ save }, { writeFile }, { downloadDir, join }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
    import('@tauri-apps/api/path'),
  ]);
  const path = await save({ defaultPath: await join(await downloadDir(), filename) });
  if (!path) {
    return; // Boîte de dialogue annulée par l'utilisateur.
  }
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

async function openBlobNatively(blob: Blob, filename: string): Promise<void> {
  const [{ writeFile, mkdir, BaseDirectory }, { openPath }, { appCacheDir, join }] = await Promise.all([
    import('@tauri-apps/plugin-fs'),
    import('@tauri-apps/plugin-opener'),
    import('@tauri-apps/api/path'),
  ]);
  // Nom unique pour ne pas écraser un document encore ouvert dans le lecteur PDF.
  const uniqueName = `${Date.now()}-${filename}`;
  await mkdir('documents', { baseDir: BaseDirectory.AppCache, recursive: true });
  await writeFile(`documents/${uniqueName}`, new Uint8Array(await blob.arrayBuffer()), {
    baseDir: BaseDirectory.AppCache,
  });
  await openPath(await join(await appCacheDir(), 'documents', uniqueName));
}
