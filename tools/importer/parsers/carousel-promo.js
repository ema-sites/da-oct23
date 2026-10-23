/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel-promo.
 * Source: div.carousel.list.parbase.hero > div.alc-carousel > ul.slides > li.slide
 * Target table (2 columns): one row per slide
 *   cell 1 = slide image (linked to the promo URL for banner-only slides)
 *   cell 2 = optional text content (logo, draw info paragraphs, CTA) - empty for banners
 */
export default function parse(element, { document }) {
  const cells = [];

  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const para = (value) => {
    const p = document.createElement('p');
    p.textContent = value;
    return p;
  };
  const cloneImg = (img) => {
    if (!img) return null;
    const out = document.createElement('img');
    out.src = img.getAttribute('src') || img.src || '';
    out.alt = img.getAttribute('alt') || '';
    return out;
  };

  // Resolve a slide background image: real <img>, data-bgimage, inline
  // background-image style, or picturefill <span data-src> (largest last).
  const bgImage = (container) => {
    if (!container) return null;
    const direct = container.querySelector(':scope > img');
    if (direct) return cloneImg(direct);
    let src = container.getAttribute('data-bgimage') || '';
    if (!src) {
      const style = container.getAttribute('style') || '';
      const m = style.match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
      if (m) src = m[1];
    }
    if (!src) {
      const spans = [...container.querySelectorAll(':scope > span[data-src]')];
      if (spans.length) src = spans[spans.length - 1].getAttribute('data-src');
    }
    if (!src) {
      const anyImg = container.querySelector('img');
      if (anyImg) return cloneImg(anyImg);
      return null;
    }
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    return img;
  };

  const slides = element.querySelectorAll('ul.slides > li.slide');

  slides.forEach((slide) => {
    const draw = slide.querySelector('.alc-external-data');
    const promo = slide.querySelector('article.fca-carousel-slide-promo');

    if (draw) {
      // Draw slide: background image + rich text content
      const bgImg = bgImage(draw);
      const content = [];

      const logo = cloneImg(draw.querySelector('.draw__logo img'));
      if (logo) content.push(logo);

      const nextDraw = text(draw.querySelector('[class*="nextDraw"] label'));
      if (nextDraw) content.push(para(nextDraw));

      const bannerLabels = [...draw.querySelectorAll('[class*="__banner__contents"] > label')]
        .map((l) => text(l)).filter(Boolean);
      if (bannerLabels.length) {
        // "$" + "5M CLASSIC JACKPOT" + "+"
        content.push(para(bannerLabels.join(' ').replace(/^\$\s+/, '$')));
      }

      // Jackpot amount. Read the text of .draw__prize-amount itself: the
      // importer unwraps its plain <span> children before parsers run, so
      // "> span" selectors find nothing. The "$" is drawn by CSS.
      const groupDigits = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      let amountDigits = text(draw.querySelector('.draw__prize-amount')).replace(/\D/g, '');
      if (!amountDigits) {
        // The div is filled by script; fall back to the draw's data-response JSON
        const holder = draw.hasAttribute('data-response') ? draw : (draw.querySelector('[data-response]') || slide.querySelector('[data-response]'));
        try {
          const data = holder && JSON.parse(holder.getAttribute('data-response'));
          const jackpot = data && data.primaryDraw && data.primaryDraw.next_draw
            && data.primaryDraw.next_draw.jackpot;
          if (jackpot !== undefined && jackpot !== null && jackpot !== '') {
            const n = Math.round(Number(jackpot));
            if (Number.isFinite(n) && n > 0) amountDigits = String(n);
          }
        } catch (e) { /* ignore malformed data-response */ }
      }
      if (amountDigits) content.push(para(`$${groupDigits(amountDigits)}`));

      const goldLabel = draw.querySelector('[class*="goldball__jackpot"] label');
      if (goldLabel) {
        // The "O" is rendered visually by an empty gradient span
        const gradient = goldLabel.querySelector('[class*="__gradient"]');
        let gold = '';
        goldLabel.childNodes.forEach((n) => {
          if (n === gradient) gold += text(n) || 'O';
          else gold += n.textContent;
        });
        gold = gold.replace(/\s+/g, ' ').trim().replace(/^G\s*O\s*LD\b/, 'GOLD');
        // e.g. "GOLD BALL JACKPOT"
        if (gold) content.push(para(gold));
      }

      const guaranteed = text(draw.querySelector('[class*="goldball__guaranteed"] label'));
      if (guaranteed) content.push(para(guaranteed));

      const cta = draw.querySelector('.draw__cta a[href]');
      if (cta) {
        const a = document.createElement('a');
        a.href = cta.getAttribute('href');
        a.textContent = text(cta);
        const p = document.createElement('p');
        p.append(a);
        content.push(p);
      }

      cells.push([bgImg || '', content.length ? content : '']);
      return;
    }

    if (promo) {
      // Banner-only slide: image linked to the promo URL, empty text cell
      const img = bgImage(promo.querySelector('.slide-content') || promo);
      const link = promo.querySelector('a[href]');
      let imageCell = img || '';
      if (img && link) {
        const a = document.createElement('a');
        a.href = link.getAttribute('href');
        a.append(img);
        imageCell = a;
      }
      cells.push([imageCell, '']);
      return;
    }

    // Fallback: any other slide with an image
    const img = cloneImg(slide.querySelector('img'));
    if (img) cells.push([img, '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-promo', cells });
  element.replaceWith(block);
}
