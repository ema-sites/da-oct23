import { createOptimizedPicture } from '../../scripts/aem.js';

let carouselId = 0;

function isEmptyCell(cell) {
  return !cell || (!cell.textContent.trim() && !cell.querySelector('picture, img'));
}

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const picture = img.closest('picture');
    const isBackground = !!img.closest('.carousel-winners-slide-image');
    picture.replaceWith(createOptimizedPicture(img.src, img.alt, false, isBackground
      ? [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]
      : [{ width: '400' }]));
  });
}

/** Top-level element of `el` inside `root` (unwraps <p><picture></p> etc.). */
function topLevel(el, root) {
  let node = el;
  while (node.parentElement && node.parentElement !== root) node = node.parentElement;
  return node;
}

/** Wraps each digit group of a prize amount in a span so it can be boxed. */
function decoratePrizeAmount(p) {
  if (p.children.length) return;
  const text = p.textContent.trim();
  p.textContent = '';
  text.split(/(\d+)/).filter((part) => part.trim() !== '').forEach((part) => {
    const span = document.createElement('span');
    span.className = /\d/.test(part) ? 'carousel-winners-digits' : 'carousel-winners-currency';
    span.textContent = part.trim();
    p.append(span);
  });
  p.setAttribute('aria-label', text);
}

/**
 * Splits the slide content into a winner group (portrait, name, location, CTA)
 * and a prize group (game logo, ribbon label, prize amount). The prize group
 * starts at the second image; with fewer images it starts at the first
 * paragraph after the CTA.
 */
function buildContent(cells) {
  const source = document.createElement('div');
  cells.forEach((c) => source.append(...c.childNodes));
  const nodes = [...source.children];

  const pictureNodes = [...source.querySelectorAll('picture, img')]
    .map((p) => topLevel(p, source))
    .filter((n, i, arr) => arr.indexOf(n) === i);
  let splitAt = -1;
  if (pictureNodes.length >= 2) {
    splitAt = nodes.indexOf(pictureNodes[1]);
  } else {
    const cta = nodes.findIndex((n) => n.querySelector('a') && !n.querySelector('picture'));
    if (cta >= 0 && cta < nodes.length - 1) splitAt = cta + 1;
  }

  const winner = document.createElement('div');
  winner.className = 'carousel-winners-winner';
  const prize = document.createElement('div');
  prize.className = 'carousel-winners-prize';
  nodes.forEach((n, i) => (splitAt >= 0 && i >= splitAt ? prize : winner).append(n));

  // winner group roles
  const portrait = winner.querySelector('picture, img');
  if (portrait) topLevel(portrait, winner).classList.add('carousel-winners-portrait');
  const info = document.createElement('div');
  info.className = 'carousel-winners-info';
  [...winner.children]
    .filter((n) => !n.classList.contains('carousel-winners-portrait'))
    .forEach((n) => info.append(n));
  const heading = info.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) heading.classList.add('carousel-winners-name');
  [...info.children].forEach((n) => {
    if (n.tagName === 'P' && !n.querySelector('a') && n.textContent.trim()) {
      n.classList.add('carousel-winners-location');
    } else if (n.querySelector('a')) {
      n.classList.add('carousel-winners-cta');
    }
  });
  if (info.children.length) winner.append(info);

  // prize group roles
  const logo = prize.querySelector('picture, img');
  if (logo) topLevel(logo, prize).classList.add('carousel-winners-logo');
  const textParas = [...prize.children]
    .filter((n) => !n.classList.contains('carousel-winners-logo') && n.textContent.trim());
  const amount = [...textParas].reverse().find((n) => /\d/.test(n.textContent));
  if (amount) {
    amount.classList.add('carousel-winners-amount');
    decoratePrizeAmount(amount);
  }
  textParas.filter((n) => n !== amount).forEach((n) => n.classList.add('carousel-winners-ribbon'));

  const content = document.createElement('div');
  content.className = 'carousel-winners-slide-content';
  if (winner.children.length) content.append(winner);
  if (prize.children.length) content.append(prize);
  return content;
}

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;
  block.querySelectorAll('.carousel-winners-slide').forEach((slide, idx) => {
    const active = idx === slideIndex;
    slide.setAttribute('aria-hidden', String(!active));
    slide.querySelectorAll('a, button').forEach((el) => {
      if (active) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  });
  block.querySelectorAll('.carousel-winners-slide-indicator button').forEach((button, idx) => {
    if (idx === slideIndex) {
      button.setAttribute('disabled', '');
      button.setAttribute('aria-current', 'true');
    } else {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    }
  });
}

function showSlide(block, slideIndex) {
  const slides = block.querySelectorAll('.carousel-winners-slide');
  if (!slides.length) return;
  const index = ((slideIndex % slides.length) + slides.length) % slides.length;
  block.querySelector('.carousel-winners-slides')
    .scrollTo({ top: 0, left: slides[index].offsetLeft, behavior: 'smooth' });
  updateActiveSlide(block, index);
}

function bindEvents(block) {
  const current = () => parseInt(block.dataset.activeSlide || '0', 10);
  block.querySelectorAll('.carousel-winners-slide-indicator button').forEach((button, idx) => {
    button.addEventListener('click', () => showSlide(block, idx));
  });
  block.querySelector('.carousel-winners-prev').addEventListener('click', () => showSlide(block, current() - 1));
  block.querySelector('.carousel-winners-next').addEventListener('click', () => showSlide(block, current() + 1));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { root: block.querySelector('.carousel-winners-slides'), threshold: 0.6 });
  block.querySelectorAll('.carousel-winners-slide').forEach((slide) => observer.observe(slide));
}

function createSlide(row, idx, id) {
  const slide = document.createElement('li');
  slide.className = 'carousel-winners-slide';
  slide.dataset.slideIndex = idx;
  slide.id = `carousel-winners-${id}-slide-${idx}`;
  slide.setAttribute('aria-roledescription', 'slide');

  const cells = [...row.children].filter((c) => !isEmptyCell(c));
  // background cell: first cell that holds only an image (no text)
  const bgCell = cells.length > 1
    ? cells.find((c) => c.querySelector('picture, img') && !c.textContent.trim())
    : null;
  if (bgCell) {
    bgCell.className = 'carousel-winners-slide-image';
    slide.append(bgCell);
  }
  const contentCells = cells.filter((c) => c !== bgCell);
  if (contentCells.length) slide.append(buildContent(contentCells));

  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);
  else slide.setAttribute('aria-label', `Slide ${idx + 1}`);
  return slide;
}

export default function decorate(block) {
  carouselId += 1;
  const id = carouselId;
  block.id = block.id || `carousel-winners-${id}`;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const rows = [...block.children].filter((row) => [...row.children].some((c) => !isEmptyCell(c)));

  const container = document.createElement('div');
  container.className = 'carousel-winners-slides-container';
  const track = document.createElement('ul');
  track.className = 'carousel-winners-slides';
  track.id = `carousel-winners-${id}-slides`;
  rows.forEach((row, idx) => track.append(createSlide(row, idx, id)));
  container.append(track);
  optimizePictures(track);
  block.replaceChildren(container);

  if (rows.length < 2) {
    block.classList.add('carousel-winners-single');
    updateActiveSlide(block, 0);
    return;
  }

  const buttons = document.createElement('div');
  buttons.className = 'carousel-winners-navigation-buttons';
  [['prev', 'Previous slide'], ['next', 'Next slide']].forEach(([dir, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `carousel-winners-${dir}`;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-controls', track.id);
    buttons.append(button);
  });
  container.append(buttons);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Carousel slide controls');
  const indicators = document.createElement('ol');
  indicators.className = 'carousel-winners-slide-indicators';
  rows.forEach((_, idx) => {
    const li = document.createElement('li');
    li.className = 'carousel-winners-slide-indicator';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show slide ${idx + 1} of ${rows.length}`);
    li.append(button);
    indicators.append(li);
  });
  nav.append(indicators);
  container.append(nav);

  updateActiveSlide(block, 0);
  bindEvents(block);
}
