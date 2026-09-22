// Локальная админка кейсов: API для загрузки картинок и сохранения экранов.
// Работает только в dev-сервере (apply: "serve"), в сборку не попадает.
import { createHash } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import sharpModule from "sharp";
import type { Plugin } from "vite";

// Типы vinext подменяют sharp заглушкой — берём настоящие объявления пакета.
const sharp = sharpModule as unknown as typeof import("../node_modules/sharp/lib/index");

type Ratio = [number, number];
type Slot = {
  kind: string;
  src: string;
  original?: string;
  focus?: [number, number];
  rotate?: number;
  rotated?: string;
  alt?: string;
  title?: string;
};
type Screen = { layout: string; slots: (Slot | null)[]; ratio?: Ratio };
type Layout = { id: string; slots: { area: string; ratio: Ratio }[] };

const MAX_BODY = 250 * 1024 * 1024;
const ORIGINAL_MAX = 2800;
const CROP_MAX = 2000;

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("Файл больше 250 МБ"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function safeSlug(slug: unknown): string {
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Некорректный slug кейса");
  }
  return slug;
}

function baseName(name: string) {
  const stem = path.basename(name).replace(/\.[^.]+$/, "");
  const clean = stem
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return clean || "image";
}

export function adminPlugin(): Plugin {
  let root = process.cwd();
  const publicDir = () => path.join(root, "public");
  const screensFile = () => path.join(root, "app", "case-screens.json");
  const layoutsFile = () => path.join(root, "app", "case-layouts.json");

  // URL вида /media/... -> путь внутри public, без выхода за его пределы.
  function publicPath(url: string) {
    const clean = decodeURIComponent(url.split("?")[0]);
    const full = path.normalize(path.join(publicDir(), clean));
    if (!full.startsWith(publicDir() + path.sep)) {
      throw new Error(`Путь вне public: ${url}`);
    }
    return full;
  }

  async function upload(req: IncomingMessage, url: URL) {
    const slug = safeSlug(url.searchParams.get("slug"));
    const name = url.searchParams.get("name") ?? "image";
    const input = await readBody(req);
    if (!input.length) throw new Error("Пустой файл");

    const hash = createHash("sha1").update(input).digest("hex").slice(0, 8);
    const rel = `/media/${slug}/src/${baseName(name)}-${hash}.webp`;
    const out = publicPath(rel);
    await mkdir(path.dirname(out), { recursive: true });

    const info = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width: ORIGINAL_MAX,
        height: ORIGINAL_MAX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(out);

    return { original: rel, width: info.width, height: info.height };
  }

  function normalizeRotation(deg: unknown): 0 | 90 | 180 | 270 {
    const n = ((Math.round(Number(deg) / 90) % 4) + 4) % 4;
    return (n * 90) as 0 | 90 | 180 | 270;
  }

  // Исходник, повёрнутый на deg по часовой: всегда от оригинала, без потерь на повторных поворотах.
  async function rotatedBuffer(source: string, deg: number) {
    const input = await readFile(publicPath(source));
    const upright = await sharp(input, { failOn: "none" }).rotate().toBuffer();
    return deg ? sharp(upright).rotate(deg).toBuffer() : upright;
  }

  async function rotatedPreview(req: IncomingMessage) {
    const body = JSON.parse((await readBody(req)).toString("utf8"));
    const slug = safeSlug(body.slug);
    const source = String(body.source ?? "");
    if (!source.startsWith("/media/")) throw new Error("Можно повернуть только загруженную картинку");
    const deg = normalizeRotation(body.rotate);
    if (!deg) return { rotated: null };
    const rel = `/media/${slug}/src/${baseName(source)}-rot${deg}.webp`;
    const out = publicPath(rel);
    if (!existsSync(out)) {
      await mkdir(path.dirname(out), { recursive: true });
      await sharp(await rotatedBuffer(source, deg))
        .webp({ quality: 88, alphaQuality: 100 })
        .toFile(out);
    }
    return { rotated: rel };
  }

  // Режет исходник под пропорции слота вокруг точки фокуса и сохраняет WebP.
  async function crop(
    slug: string,
    source: string,
    ratio: Ratio,
    focus?: [number, number],
    rotate = 0,
  ) {
    const [fx, fy] = focus ?? [50, 50];
    const deg = normalizeRotation(rotate);
    const turn = deg ? `-r${deg}` : "";
    const key = `${ratio[0]}x${ratio[1]}-${Math.round(fx)}-${Math.round(fy)}`;
    const rel = `/media/${slug}/${baseName(source)}${turn}-${key}.webp`;
    const out = publicPath(rel);
    if (existsSync(out)) return rel;

    const buffer = await rotatedBuffer(source, deg);
    const image = sharp(buffer, { failOn: "none" });
    const meta = await image.metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) throw new Error(`Не удалось прочитать ${source}`);

    const target = ratio[0] / ratio[1];
    let cw = W;
    let ch = Math.round(W / target);
    if (ch > H) {
      ch = H;
      cw = Math.round(H * target);
    }
    const left = Math.min(Math.max(Math.round((fx / 100) * W - cw / 2), 0), W - cw);
    const top = Math.min(Math.max(Math.round((fy / 100) * H - ch / 2), 0), H - ch);

    await mkdir(path.dirname(out), { recursive: true });
    await image
      .extract({ left, top, width: cw, height: ch })
      .resize({ width: CROP_MAX, height: CROP_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, alphaQuality: 100 })
      .toFile(out);
    return rel;
  }

  // Нарезки, на которые больше не ссылается ни один экран кейса. Исходники в src/ не трогаем.
  async function removeStaleCrops(slug: string, screens: Screen[]) {
    const used = new Set(
      screens.flatMap((screen) => screen.slots.map((slot) => slot?.src)).filter(Boolean),
    );
    const dir = publicPath(`/media/${slug}/`);
    if (!existsSync(dir)) return;
    for (const file of await readdir(dir)) {
      if (!/-\d+x\d+-\d+-\d+\.webp$/.test(file)) continue;
      if (!used.has(`/media/${slug}/${file}`)) await rm(path.join(dir, file));
    }
  }

  async function save(req: IncomingMessage) {
    const body = JSON.parse((await readBody(req)).toString("utf8"));
    const slug = safeSlug(body.slug);
    const screens: Screen[] = Array.isArray(body.screens) ? body.screens : [];
    const layouts: Layout[] = JSON.parse(await readFile(layoutsFile(), "utf8")).layouts;

    const processed: Screen[] = [];
    for (const screen of screens) {
      const layout = layouts.find((l) => l.id === screen.layout);
      if (!layout) {
        processed.push(screen);
        continue;
      }
      const slots: (Slot | null)[] = [];
      for (let i = 0; i < layout.slots.length; i++) {
        const slot = screen.slots[i];
        if (!slot) {
          slots.push(null);
          continue;
        }
        if (slot.kind !== "image") {
          slots.push(slot);
          continue;
        }
        const source = slot.original ?? slot.src;
        if (!source.startsWith("/media/")) {
          slots.push(slot);
          continue;
        }
        const src = await crop(slug, source, layout.slots[i].ratio, slot.focus, slot.rotate);
        slots.push({ ...slot, src, original: source });
      }
      processed.push({ layout: screen.layout, slots });
    }

    const store = existsSync(screensFile())
      ? JSON.parse(await readFile(screensFile(), "utf8"))
      : {};
    if (processed.length) store[slug] = processed;
    else delete store[slug];
    await writeFile(screensFile(), JSON.stringify(store, null, 2) + "\n");
    await removeStaleCrops(slug, processed);
    return { slug, screens: processed };
  }

  return {
    name: "vsetak-admin",
    apply: "serve",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      // Только что созданные нарезки Vite замечает с задержкой и какое-то время
      // отвечает 404 — отдаём файлы из public/media прямо с диска.
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" || !req.url?.startsWith("/media/")) return next();
        try {
          const file = publicPath(req.url);
          if (!existsSync(file) || !statSync(file).isFile()) return next();
          const ext = path.extname(file).toLowerCase();
          const types: Record<string, string> = {
            ".webp": "image/webp",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".mp4": "video/mp4",
          };
          if (!types[ext]) return next();
          res.setHeader("Content-Type", types[ext]);
          res.setHeader("Cache-Control", "no-cache");
          createReadStream(file).pipe(res);
        } catch {
          next();
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/__admin/")) return next();
        const url = new URL(req.url, "http://localhost");
        try {
          if (req.method === "POST" && url.pathname === "/__admin/upload") {
            return send(res, 200, await upload(req, url));
          }
          if (req.method === "POST" && url.pathname === "/__admin/rotate") {
            return send(res, 200, await rotatedPreview(req));
          }
          if (req.method === "POST" && url.pathname === "/__admin/save") {
            return send(res, 200, await save(req));
          }
          send(res, 404, { error: "Нет такого метода" });
        } catch (error) {
          send(res, 400, { error: (error as Error).message });
        }
      });
    },
  };
}
