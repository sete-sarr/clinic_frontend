import { Capacitor } from '@capacitor/core';
import { isTauri } from '@tauri-apps/api/core';

// Les exports CSV portent un nom de fichier Content-Disposition: attachment — une simple URL blob
// via window.open() l'ignore, donc le fichier a besoin d'un <a download> synthétique pour être
// enregistré sous le bon nom.
//
// Dans l'application de bureau (Tauri), la webview n'honore ni <a download> ni window.open() sur une
// URL blob : on passe alors par les plugins natifs (boîte « Enregistrer sous », écriture disque,
// ouverture dans l'application par défaut). Dans l'application mobile (Capacitor), le fichier est écrit
// sur le téléphone puis proposé dans le menu de partage Android/iOS (ouvrir avec le lecteur PDF,
// enregistrer, envoyer). Les plugins sont chargés en import() dynamique pour ne rien ajouter au bundle
// initial de la version web.
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (Capacitor.isNativePlatform()) {
    void shareBlobOnMobile(blob, filename).catch((error) => console.error(error));
    return;
  }
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
  if (Capacitor.isNativePlatform()) {
    void shareBlobOnMobile(blob, filename).catch((error) => console.error(error));
    return;
  }
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

async function shareBlobOnMobile(blob: Blob, filename: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  // Cache de l'application : nom unique pour ne pas écraser un document encore ouvert.
  const { uri } = await Filesystem.writeFile({
    path: `documents/${Date.now()}-${filename}`,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({ title: filename, files: [uri] });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
