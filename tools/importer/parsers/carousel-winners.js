/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel-winners.
 * Source: .winners_carousel / .winners-carousel (slick slider)
 *   real slides: .slick-slide:not(.slick-cloned) > div > .slide
 * Target table (2 columns): one row per slide
 *   cell 1 = background illustration image
 *   cell 2 = portrait image, H3 winner name, location paragraph, CTA link,
 *            game logo image, ribbon label paragraph, prize amount paragraph
 */
export default function parse(element, { document }) {
  const cells = [];

  // The slide background is applied by CSS on .standard-bg (not in the DOM);
  // used only when no <img> is present in the slide.
  const DEFAULT_BG = '/content/dam/alc/images/static/winners-carousel/winners-carousel-bg-generic.png';

  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const makeImg = (src, alt = '') => {
    if (!src) return null;
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    return img;
  };
  const cloneImg = (img) => (img ? makeImg(img.getAttribute('src') || img.src, img.getAttribute('alt') || '') : null);
  const styleBg = (el) => {
    if (!el) return '';
    const style = el.getAttribute('style') || '';
    const m = style.match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    return m ? encodeURI(decodeURI(m[1].trim())) : '';
  };

  // Prefer the real (non-cloned) slick slides; fall back to raw .slide nodes
  let slides = [...element.querySelectorAll('.slick-slide:not(.slick-cloned) .slide')];
  if (!slides.length) slides = [...element.querySelectorAll('.slide')];

  slides.forEach((slide) => {
    // cell 1: background image
    const bgImg = cloneImg(slide.querySelector(':scope > img'))
      || makeImg(styleBg(slide))
      || (slide.classList.contains('standard-bg') ? makeImg(DEFAULT_BG) : null);

    // cell 2: winner content
    const content = [];

    const portraitEl = slide.querySelector('.winner-image');
    const portrait = cloneImg(portraitEl && portraitEl.querySelector('img')) || makeImg(styleBg(portraitEl));
    if (portrait) content.push(portrait);

    const info = slide.querySelector('.winner-info');
    const name = text(info && info.querySelector('h3, h2, h4'));
    if (name) {
      const h3 = document.createElement('h3');
      h3.textContent = name;
      content.push(h3);
    }

    const location = text(info && info.querySelector('.h2, span'));
    if (location) {
      const p = document.createElement('p');
      p.textContent = location;
      content.push(p);
    }

    const cta = info && info.querySelector('a[href]');
    if (cta) {
      const a = document.createElement('a');
      a.href = cta.getAttribute('href').replace(/\.html\.html(?=$|[?#])/, '.html');
      a.textContent = text(cta) || 'See all winners';
      const p = document.createElement('p');
      p.append(a);
      content.push(p);
    }

    const prize = slide.querySelector('.prize-details');
    if (prize) {
      const logo = cloneImg(prize.querySelector('.winning-game-logo, .game-title img'));
      if (logo) content.push(logo);

      const ribbon = text(prize.querySelector('.winning-game-ribbon'));
      if (ribbon) {
        const p = document.createElement('p');
        p.textContent = ribbon;
        content.push(p);
      }

      const amountEl = prize.querySelector('.prize-amount');
      if (amountEl) {
        // Plain <span> digit groups are unwrapped by the importer before
        // parsers run, so take all digits and regroup them with spaces.
        const raw = text(amountEl);
        const digits = raw.replace(/\D/g, '');
        const amount = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : raw;
        if (amount) {
          const p = document.createElement('p');
          // the "$" sign is rendered via CSS on the source site
          p.textContent = amount.startsWith('$') ? amount : `$${amount}`;
          content.push(p);
        }
      }
    }

    if (!bgImg && !content.length) return;
    cells.push([bgImg || '', content.length ? content : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-winners', cells });
  element.replaceWith(block);
}
