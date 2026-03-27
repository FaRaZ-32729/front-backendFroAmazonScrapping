// const { getRandomAgent } = require("../utils/browserManager");

// // maxPages is now passed in from the route — default 3
// module.exports = async function searchProducts(page, keyword, maxPages = 3) {

//   const allLinks = new Set();

//   await page.setUserAgent(getRandomAgent());

//   console.log(`Searching Amazon UK — keyword: "${keyword}", pages: ${maxPages}`);

//   for (let pageNum = 1; pageNum <= maxPages; pageNum++) {

//     const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(keyword)}&page=${pageNum}`;

//     console.log(`Opening search page ${pageNum}/${maxPages}:`, url);

//     const loaded = await safeGoto(page, url);

//     if (!loaded) {
//       console.log(`Page ${pageNum} failed to load — skipping`);
//       continue;
//     }

//     await randomDelay(4000, 7000);

//     const hasCaptcha = await page.$('form[action="/errors/validateCaptcha"]');

//     if (hasCaptcha) {
//       console.log("CAPTCHA hit — waiting 45 seconds then retrying");
//       await randomDelay(45000, 50000);
//       pageNum--;
//       continue;
//     }

//     await autoScroll(page);

//     const links = await page.evaluate(() => {

//       const found = new Set();

//       document.querySelectorAll('a[href*="/dp/"]').forEach(el => {

//         if (!el.href) return;

//         const url = new URL(el.href);
//         const clean = url.origin + url.pathname;

//         if (clean.includes("/dp/")) found.add(clean);

//       });

//       return [...found];

//     });

//     console.log(`Page ${pageNum}: found ${links.length} products`);

//     links.forEach(l => allLinks.add(l));

//     await randomDelay(2000, 4000);

//   }

//   console.log("Total unique products collected:", allLinks.size);

//   return [...allLinks];

// };

// // ─── Helpers ──────────────────────────────────────────────

// async function safeGoto(page, url, retries = 2) {

//   for (let attempt = 1; attempt <= retries; attempt++) {

//     try {

//       await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
//       return true;

//     } catch (err) {

//       console.log(`Navigation failed (attempt ${attempt}):`, err.message);
//       if (attempt < retries) await randomDelay(3000, 6000);

//     }

//   }

//   return false;

// }

// async function autoScroll(page) {

//   await page.evaluate(async () => {

//     await new Promise(resolve => {

//       let scrolled = 0;
//       const step = 250;

//       const timer = setInterval(() => {

//         window.scrollBy(0, step);
//         scrolled += step;

//         if (scrolled >= document.body.scrollHeight) {
//           clearInterval(timer);
//           resolve();
//         }

//       }, 150 + Math.floor(Math.random() * 100));

//     });

//   });

// }

// function randomDelay(min, max) {
//   const ms = Math.floor(Math.random() * (max - min)) + min;
//   return new Promise(r => setTimeout(r, ms));
// }


const { getRandomAgent } = require("../utils/browserManager");

// ─────────────────────────────────────────────────────────
// searchProducts(page, keyword, maxPages, skipPages)
//
// skipPages — how many pages to skip before starting
// maxPages  — how many pages to actually scrape after skipping
//
// Examples:
//   skipPages=0, maxPages=5  → scrapes pages 1–5
//   skipPages=5, maxPages=2  → scrapes pages 6–7
//   skipPages=7, maxPages=3  → scrapes pages 8–10
// ─────────────────────────────────────────────────────────

module.exports = async function searchProducts(page, keyword, maxPages = 3, skipPages = 0) {

  const allLinks = new Set();
  const startPage = skipPages + 1;
  const endPage = skipPages + maxPages;

  await page.setUserAgent(getRandomAgent());

  console.log(
    `Searching Amazon UK — keyword: "${keyword}" | ` +
    `pages: ${startPage}–${endPage} (skip: ${skipPages}, scrape: ${maxPages})`
  );

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {

    const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(keyword)}&page=${pageNum}`;

    console.log(`Opening search page ${pageNum} (${pageNum - skipPages}/${maxPages}):`, url);

    const loaded = await safeGoto(page, url);

    if (!loaded) {
      console.log(`Page ${pageNum} failed to load — skipping`);
      continue;
    }

    await randomDelay(4000, 7000);

    const hasCaptcha = await page.$('form[action="/errors/validateCaptcha"]');

    if (hasCaptcha) {
      console.log("CAPTCHA hit — waiting 45 seconds then retrying");
      await randomDelay(45000, 50000);
      pageNum--;   // retry same page
      continue;
    }

    await autoScroll(page);

    const links = await page.evaluate(() => {

      const found = new Set();

      document.querySelectorAll('a[href*="/dp/"]').forEach(el => {

        if (!el.href) return;

        const url = new URL(el.href);
        const clean = url.origin + url.pathname;

        if (clean.includes("/dp/")) found.add(clean);

      });

      return [...found];

    });

    console.log(`Page ${pageNum}: found ${links.length} products`);

    links.forEach(l => allLinks.add(l));

    await randomDelay(2000, 4000);

  }

  console.log("Total unique products collected:", allLinks.size);

  return [...allLinks];

};

// ─── Helpers ──────────────────────────────────────────────

async function safeGoto(page, url, retries = 2) {

  for (let attempt = 1; attempt <= retries; attempt++) {

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      return true;
    } catch (err) {
      console.log(`Navigation failed (attempt ${attempt}):`, err.message);
      if (attempt < retries) await randomDelay(3000, 6000);
    }

  }

  return false;

}

async function autoScroll(page) {

  await page.evaluate(async () => {

    await new Promise(resolve => {

      let scrolled = 0;
      const step = 250;

      const timer = setInterval(() => {

        window.scrollBy(0, step);
        scrolled += step;

        if (scrolled >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }

      }, 150 + Math.floor(Math.random() * 100));

    });

  });

}

function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(r => setTimeout(r, ms));
}