import { createOptimizedPicture } from '../../scripts/aem.js';

const FLAG_MAX_LENGTH = 12;

function isEmptyCell(cell) {
  return !cell || (!cell.textContent.trim() && !cell.querySelector('picture, img'));
}

function isImageCell(cell) {
  return !!cell.querySelector('picture, img')
    && !cell.querySelector('h1, h2, h3, h4, h5, h6')
    && !cell.textContent.trim();
}

/**
 * Assigns roles to the body cell content:
 * - short paragraph(s) before the title -> corner flag (e.g. "NEW"), moved onto the image
 * - first heading -> title
 * - first text paragraph after the title -> description
 * - further text paragraphs -> draw info (next draw date, jackpot)
 * - last paragraph that is only a link -> CTA
 */
function decorateBody(body, imageWrap) {
  const children = [...body.children];
  const headingIdx = children.findIndex((el) => /^H[1-6]$/.test(el.tagName));

  if (headingIdx > 0) {
    children.slice(0, headingIdx).forEach((el) => {
      const text = el.textContent.trim();
      if (imageWrap && text && text.length <= FLAG_MAX_LENGTH && !el.querySelector('picture, img')) {
        el.classList.add('cards-game-tile-flag');
        imageWrap.append(el);
      }
    });
  }
  if (headingIdx >= 0) children[headingIdx].classList.add('cards-game-tile-title');

  const rest = children.slice(headingIdx + 1).filter((el) => el.parentElement === body);
  const isLinkOnly = (el) => {
    const links = el.querySelectorAll('a');
    return links.length === 1 && links[0].textContent.trim() === el.textContent.trim();
  };
  const cta = [...rest].reverse().find((el) => el.tagName === 'P' && isLinkOnly(el));
  if (cta) {
    cta.classList.add('cards-game-tile-cta');
    body.append(cta); // CTA always last so it can pin to the bottom
  }

  let descriptionFound = false;
  rest.filter((el) => el !== cta && el.tagName === 'P' && el.textContent.trim()).forEach((el) => {
    if (!descriptionFound) {
      el.classList.add('cards-game-tile-description');
      descriptionFound = true;
    } else {
      el.classList.add('cards-game-tile-draw');
    }
  });
}

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((c) => !isEmptyCell(c));
    if (!cells.length) return;

    const li = document.createElement('li');
    li.className = 'cards-game-tile-card';

    const imageCell = cells.find(isImageCell);
    const bodyCells = cells.filter((c) => c !== imageCell);

    let imageWrap;
    if (imageCell) {
      imageCell.className = 'cards-game-tile-image';
      imageWrap = imageCell;
      li.append(imageCell);
    }

    if (bodyCells.length) {
      const body = document.createElement('div');
      body.className = 'cards-game-tile-body';
      bodyCells.forEach((c) => body.append(...c.childNodes));
      li.append(body);
      decorateBody(body, imageWrap);
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
    );
  });

  block.replaceChildren(ul);
}
