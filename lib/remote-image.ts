import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import sharp from "sharp";
import { MAX_IMAGE_BYTES } from "@/lib/image-upload";

// Downloads an image from a user-supplied link so we can store our own copy.
//
// The server fetching arbitrary URLs is an SSRF risk, so: http(s) only,
// default ports only, every hostname (including each redirect hop) must
// resolve to a public address, and size and time are capped.
// Known gap: DNS could change between our lookup and fetch's own lookup
// (rebinding). Acceptable here because the response must also decode as an
// image, so nothing else from an internal service could come back.

// Camera originals are big; we only keep the downscaled copy.
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;
const MAX_EDGE = 1024;

export class RemoteImageError extends Error {}

export type RemoteImage = { data: Buffer; contentType: string; extension: string; originalBytes: number };

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // includes cloud metadata 169.254.169.254
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3], // multicast + reserved
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

// BlockList also matches IPv4-mapped IPv6 (::ffff:127.0.0.1) against the
// IPv4 rules.
function isBlockedAddress(address: string) {
  return blocked.check(address, isIP(address) === 6 ? "ipv6" : "ipv4");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RemoteImageError("That doesn't look like a link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new RemoteImageError("Only http:// and https:// links work.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new RemoteImageError("That link can't be used.");
  }
  if (url.username || url.password) {
    throw new RemoteImageError("Links with a username or password can't be used.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string }[];
  try {
    addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  } catch {
    throw new RemoteImageError("Couldn't find that website.");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new RemoteImageError("That link can't be used.");
  }
  return url;
}

async function readCapped(response: Response): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length"));
  if (declared > MAX_DOWNLOAD_BYTES) throw new RemoteImageError("That image is larger than 20 MB.");

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body!.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new RemoteImageError("That image is larger than 20 MB.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function download(raw: string): Promise<Buffer> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual", // each hop is re-checked above
        signal,
        cache: "no-store",
        headers: { Accept: "image/*" },
      });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      throw new RemoteImageError(timedOut ? "That website took too long to respond." : "Couldn't download that link.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      current = new URL(location, url).toString();
      continue;
    }
    if (!response.ok || !response.body) {
      throw new RemoteImageError(`Couldn't download that link (HTTP ${response.status}).`);
    }
    return readCapped(response);
  }
  throw new RemoteImageError("That link redirects too many times.");
}

// Downloads, checks the bytes really are a supported image (the
// Content-Type header isn't trusted), and downscales it like browser uploads.
export async function fetchRemoteImage(raw: string): Promise<RemoteImage> {
  const original = await download(raw.trim());

  let format: string | undefined;
  try {
    format = (await sharp(original).metadata()).format;
  } catch {
    // handled below
  }

  // GIFs keep their animation, so they're stored as-is.
  if (format === "gif") {
    if (original.length > MAX_IMAGE_BYTES) throw new RemoteImageError("GIFs must be 5 MB or smaller.");
    return { data: original, contentType: "image/gif", extension: "gif", originalBytes: original.length };
  }
  if (format !== "jpeg" && format !== "png" && format !== "webp") {
    throw new RemoteImageError("That link isn't a PNG, JPEG, WebP or GIF image.");
  }

  const data = await sharp(original)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return { data, contentType: "image/jpeg", extension: "jpg", originalBytes: original.length };
}
