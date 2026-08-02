import fs from "node:fs";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

export async function compressFile(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  await pipeline(
    createReadStream(sourcePath),
    createGzip({ level: 9 }),
    createWriteStream(destinationPath)
  );
}

export async function decompressToFile(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  const { createGunzip } = await import("node:zlib");

  await pipeline(
    createReadStream(sourcePath),
    createGunzip(),
    createWriteStream(destinationPath)
  );
}

export function getFileSizeBytes(filePath: string): number {
  return fs.statSync(filePath).size;
}
