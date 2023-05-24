// eslint-disable-next-line @typescript-eslint/no-namespace
namespace AsarRaw {
  export interface FileIntegrity {
    algorithm: string;
    blockSize: number;
    blocks: string[];
    hash: string;
  }

  export interface File {
    integrity?: FileIntegrity;
    offset: string;
    size: number;
  }

  export interface Folder {
    files: Record<string, Dirent>;
  }

  export type Dirent = File | Folder;

  export function isFolder(dirent: Dirent): dirent is Folder {
    return "files" in dirent;
  }
}

export interface Folder {
  files: Record<string, File>;
}

export interface File extends AsarRaw.File {
  newValue?: Blob;
}

export type Dirent = File | Folder;

export function isFolder(dirent: Dirent): dirent is Folder {
  return "files" in dirent;
}

export async function modifyFile(file: File, newValue: Blob) {
  file.newValue = newValue;
  file.size = newValue.size;
  file.offset = "";

  if (file.integrity) {
    const hash = await digestSHA256(await newValue.arrayBuffer());

    file.integrity = {
      algorithm: "SHA256",
      blockSize: newValue.size,
      blocks: [hash],
      hash,
    };
  }
}

export async function createFile(newValue: Blob, integrity = false) {
  const file: File = {
    newValue,
    size: newValue.size,
    offset: "",
  };

  if (integrity) {
    const hash = await digestSHA256(await newValue.arrayBuffer());

    file.integrity = {
      algorithm: "SHA256",
      blockSize: newValue.size,
      blocks: [hash],
      hash,
    };
  }

  return file;
}

async function digestSHA256(data: ArrayBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

async function compileRoot(asar: Asar) {
  const newRoot: AsarRaw.Folder = { files: {} };

  const parts: BlobPart[] = [];
  let partsOffset = 0;

  interface StackItem {
    oldFolder: Folder;
    newFolder: AsarRaw.Folder;
  }

  const stack: StackItem[] = [
    {
      oldFolder: asar,
      newFolder: newRoot,
    },
  ];

  let e: StackItem | undefined;

  while ((e = stack.pop())) {
    for (const name in e.oldFolder.files) {
      const dirent = e.oldFolder.files[name];

      if (isFolder(dirent)) {
        const newFolder: AsarRaw.Folder = {
          files: {},
        };

        e.newFolder.files[name] = newFolder;

        stack.push({
          oldFolder: dirent,
          newFolder,
        });
      } else {
        const data = asar.getFile(dirent);

        const newFile: AsarRaw.File = {
          offset: partsOffset.toString(),
          size: data.size,
          integrity: dirent.integrity,
        };

        parts.push(data);

        partsOffset += newFile.size;

        e.newFolder.files[name] = newFile;
      }
    }
  }

  return {
    root: newRoot,
    data: new Blob(parts, { type: "application/octet-stream" }),
  };
}

export async function compileAsar(asar: Asar) {
  const header = new ArrayBuffer(16);
  const headerView = new DataView(header);

  const compiled = await compileRoot(asar);
  const rootEncoded = new TextEncoder().encode(JSON.stringify(compiled.root));

  headerView.setUint32(0, 0x4, true);
  headerView.setUint32(4, rootEncoded.byteLength + 8, true);
  headerView.setUint32(8, rootEncoded.byteLength + 4, true);
  headerView.setUint32(12, rootEncoded.byteLength, true);

  return new Blob([headerView, rootEncoded, compiled.data], {
    type: "application/octet-stream",
  });
}

export class Asar implements Folder {
  private headerSize: number;
  private blob: Blob;
  files: Folder["files"];
  constructor(blob: Blob, headerSize: number, root: Folder) {
    this.blob = blob;
    this.headerSize = headerSize;
    this.files = root.files;
  }
  getFile(file: File) {
    if (file.newValue) return file.newValue;
    const offset = 8 + this.headerSize + parseInt(file.offset);
    return this.blob.slice(offset, offset + file.size);
  }
}

export const asarURL = "http://test";

export function resolvePath(folder: Folder, path: string) {
  const { pathname } = new URL(path, asarURL);

  let depth: Dirent = folder;

  for (const file of pathname.slice(1).split("/")) {
    if (!file.length) return depth;
    if (!isFolder(depth))
      throw new TypeError("Attempt to read file inside file");
    depth = depth.files[file];
    if (!depth) throw new TypeError("File not found");
  }

  return depth;
}

export async function openAsar(blob: Blob) {
  const headerSize = new DataView(
    await blob.slice(0, 8).arrayBuffer()
  ).getUint32(4, true);

  const payloadSize = new DataView(
    await blob.slice(8, 16).arrayBuffer()
  ).getUint32(4, true);

  const header = await blob.slice(16, 16 + payloadSize).text();

  const root = JSON.parse(header) as Folder;

  return new Asar(blob, headerSize, root);
}
