import sharp from "sharp";
import pLimit from "p-limit";
import axios from "axios";
import https from "https";

// Default Config
const WORLD_SIZE = 4500;
const TILE_SIZE = 256;
const GRID_TEMPLATE =
  "https://content.rustmaps.com/grids/{size}/{z}/{x}/{y}.png";
const CONCURRENCY = 25;

// Keep-Alive agent for faster fetches
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: CONCURRENCY,
});

interface TileRange {
  tilesX: number;
  tilesY: number;
  mapSize: number;
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

interface CompositeTile {
  input: Buffer;
  left: number;
  top: number;
}

// Get tiles size & number
function tilesForZoom(
  z: number,
  worldSize: number = WORLD_SIZE,
  tileSize: number = TILE_SIZE
): TileRange {
  const scale = Math.pow(2, -z);
  const mapSize = Math.floor(worldSize / scale);
  const tilesX = Math.ceil(mapSize / tileSize);
  const tilesY = Math.ceil(mapSize / tileSize);

  const xmin = Math.floor(-tilesX / 2);
  const xmax = Math.floor(tilesX / 2) - 1;
  const ymin = Math.floor(-tilesY / 2);
  const ymax = Math.floor(tilesY / 2) - 1;

  return { tilesX, tilesY, mapSize, xmin, xmax, ymin, ymax };
}

// Fetch tiles with retries
async function fetchTile(
  size: number,
  z: number,
  x: number,
  y: number,
  retries: number = 3
): Promise<Buffer | null> {
  const url = GRID_TEMPLATE.replace("{size}", size.toString())
    .replace("{z}", z.toString())
    .replace("{x}", x.toString())
    .replace("{y}", y.toString());

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        httpsAgent,
        responseType: "arraybuffer", // ensure binary
        headers: { "User-Agent": "rustmap-downloader/2.0" },
        timeout: 10_000,
      });

      if (res.status === 200) {
        return Buffer.from(res.data);
      }
      console.warn(`${url} status ${res.status} attempt ${attempt}`);
    } catch (err) {
      console.warn(`Fetch failed ${url} attempt ${attempt}`);
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }

  console.error(
    `Failed to fetch tile z=${z} x=${x} y=${y} after ${retries} attempts`
  );
  return null;
}

// Build map image
export async function buildMapImage(
  size: number,
  highResUrl: string,
  z: number = 0
): Promise<Buffer> {
  const { tilesX, tilesY } = tilesForZoom(z, size);

  // Build grid layer
  const gridBase = sharp({
    create: {
      width: tilesX * TILE_SIZE,
      height: tilesY * TILE_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png();

  const limit = pLimit(CONCURRENCY);
  const tasks: Promise<CompositeTile | null>[] = [];
  let fetchedCount = 0;
  const totalTiles = tilesX * tilesY;

  // Queue tile fetches
  for (let xi = 0; xi < tilesX; xi++) {
    for (let yi = 0; yi < tilesY; yi++) {
      const tileX = xi - Math.floor(tilesX / 2);
      const tileY = yi - Math.floor(tilesY / 2);

      tasks.push(
        limit(async () => {
          const tile = await fetchTile(size, z, tileX, tileY);
          fetchedCount++;
          if (fetchedCount % 50 === 0 || fetchedCount === totalTiles) {
            console.log(`Fetched ${fetchedCount}/${totalTiles} tiles`);
          }
          if (!tile) return null;
          return { input: tile, left: xi * TILE_SIZE, top: yi * TILE_SIZE };
        })
      );
    }
  }

  const composites = (await Promise.all(tasks)).filter(
    (t): t is CompositeTile => t !== null
  );
  const gridBuffer = await gridBase.composite(composites).png().toBuffer();

  const res = await axios.get(highResUrl, {
    httpsAgent,
    responseType: "arraybuffer",
    headers: { "User-Agent": "BattleMetrics-Monitor/1.0" },
    timeout: 20_000,
  });
  if (res.status !== 200) throw new Error(`Failed to fetch: ${res.status}`);

  const highResBuffer = Buffer.from(res.data);

  const finalImage = await sharp(highResBuffer)
    .composite([{ input: gridBuffer, blend: "over" }])
    .png()
    .toBuffer();

  const croppedImage = await sharp(finalImage).trim().png().toBuffer();

  return croppedImage;
}