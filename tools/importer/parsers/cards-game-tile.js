/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-game-tile.
 * Source: .cmp-container--game-tiles > .cmp-container > div.game-tile.parbase > article.game-tile
 * Target table (2 columns): one row per tile
 *   cell 1 = tile image (background image of .game-tile-image-container)
 *   cell 2 = optional flag paragraph (NEW), H3 title, description paragraph(s),
 *            optional next-draw / jackpot paragraphs, CTA link last
 */
export default function parse(element, { document }) {
  const cells = [];

  const clean = (s) => (s || '').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  const text = (el) => (el ? clean(el.textContent) : '');
  const para = (value) => {
    const p = document.createElement('p');
    p.textContent = value;
    return p;
  };
  const makeImg = (src, alt = '') => {
    if (!src) return null;
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    return img;
  };
  const styleBg = (el) => {
    if (!el) return '';
    const style = el.getAttribute('style') || '';
    const m = style.match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    return m ? m[1].trim() : '';
  };

  let tiles = [...element.querySelectorAll('div.game-tile.parbase > article.game-tile')];
  if (!tiles.length) tiles = [...element.querySelectorAll('article.game-tile')];

  tiles.forEach((tile) => {
    const imgContainer = tile.querySelector('.game-tile-image-container');
    const title = text(tile.querySelector('.game-tile-title'));

    // cell 1: tile image (direct <img> in cached HTML, background-image on live page)
    let image = null;
    if (imgContainer) {
      const direct = imgContainer.querySelector(':scope > img');
      if (direct) image = makeImg(direct.getAttribute('src') || direct.src, direct.getAttribute('alt') || title);
      else image = makeImg(styleBg(imgContainer), title);
    }

    // cell 2: text content
    const content = [];

    const flag = imgContainer && imgContainer.querySelector('.game-flag');
    if (flag) {
      let flagText = text(flag);
      // untranslated i18n keys such as "[new-en]"
      const key = flagText.match(/^\[([a-z]+)-[a-z]{2}\]$/i);
      if (key) flagText = key[1];
      if (!flagText && flag.classList.contains('new')) flagText = 'new';
      if (flagText) content.push(para(flagText.toUpperCase()));
    }

    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      content.push(h3);
    }

    // description: keep paragraphs and inline links (e.g. "Read more")
    const desc = tile.querySelector('.game-tile-description');
    if (desc) {
      const ps = [...desc.querySelectorAll('p')];
      (ps.length ? ps : [desc]).forEach((src) => {
        if (!text(src)) return;
        const p = document.createElement('p');
        src.childNodes.forEach((n) => {
          if (n.nodeType === 3) {
            p.append(document.createTextNode(n.textContent.replace(/\s+/g, ' ')));
          } else if (n.nodeType === 1 && n.tagName === 'A' && n.getAttribute('href')) {
            const a = document.createElement('a');
            a.href = n.getAttribute('href');
            a.textContent = text(n);
            p.append(a);
          } else if (n.nodeType === 1) {
            p.append(document.createTextNode(n.textContent.replace(/\s+/g, ' ')));
          }
        });
        content.push(p);
      });
    }

    // next draw / jackpot info
    const nextDate = tile.querySelector('.game-tile-content .next-jackpot-date');
    if (text(nextDate)) content.push(para(text(nextDate)));
    const nextPrize = tile.querySelector('.game-tile-content .next-jackpot-prize');
    if (text(nextPrize)) content.push(para(text(nextPrize)));
    const extraBar = imgContainer && imgContainer.querySelector('.max-plus-bar');
    // Use the whole bar's text (e.g. "+ 20 × $100,000"); its plain <span>
    // children are unwrapped by the importer before parsers run.
    // Join child nodes with a space so "+ 20" and "× $100,000" stay separated.
    if (text(extraBar)) {
      const barText = clean([...extraBar.childNodes].map((n) => n.textContent).join(' '))
        .replace(/(\d)\s*×/g, '$1 ×');
      content.push(para(barText));
    }
    tile.querySelectorAll('.game-tile-content .prize-info').forEach((pi) => {
      if (text(pi)) content.push(para(text(pi)));
    });

    // CTA (last)
    const cta = tile.querySelector('.game-tile-content > a.button[href], .game-tile-content a.arrow-button[href]');
    if (cta) {
      const a = document.createElement('a');
      a.href = cta.getAttribute('href');
      a.textContent = text(cta);
      const p = document.createElement('p');
      p.append(a);
      content.push(p);
    }

    if (!image && !content.length) return;
    cells.push([image || '', content.length ? content : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-game-tile', cells });
  element.replaceWith(block);
}
