import { createRequire } from "node:module";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  "C:\\Users\\XuanCanh\\.codex\\skills\\playwright-skill\\node_modules\\playwright"
);

const here = dirname(fileURLToPath(import.meta.url));
const rawDir = join(here, "raw");
const readmeUrl = pathToFileURL(join(here, "readme.html")).href;
const onchainUrl = pathToFileURL(join(here, "onchain.html")).href;
const demoUrl = "https://stellar-zk-kit-demo.vercel.app/";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

rmSync(rawDir, { recursive: true, force: true });
mkdirSync(rawDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: rawDir,
    size: { width: 1920, height: 1080 },
  },
});

const page = await context.newPage();

await page.goto(readmeUrl, { waitUntil: "load" });
await page.waitForTimeout(12000);
await page.mouse.wheel(0, 420);
await page.waitForTimeout(9000);
await page.mouse.wheel(0, 520);
await page.waitForTimeout(8000);

await page.goto(demoUrl, { waitUntil: "networkidle" });
await page.waitForTimeout(6000);
await page.locator("input").nth(0).fill("500");
await page.waitForTimeout(2500);
await page.locator("input").nth(1).fill("1000");
await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Generate proof" }).click();
await page.getByText("Proof generated").waitFor({ timeout: 180000 });
await page.waitForTimeout(10000);
await page.mouse.wheel(0, 600);
await page.waitForTimeout(9000);
await page.mouse.wheel(0, 700);
await page.waitForTimeout(12000);

await page.goto(onchainUrl, { waitUntil: "load" });
await page.waitForTimeout(23000);

const video = page.video();
await context.close();
await browser.close();

const rawPath = await video.path();
const finalRawPath = join(here, "stellar_zk_kit_demo_raw.webm");
renameSync(rawPath, finalRawPath);
console.log(finalRawPath);
