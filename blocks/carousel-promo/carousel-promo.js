import { createOptimizedPicture } from '../../scripts/aem.js';

const AUTOPLAY_MS = 6000;
let carouselId = 0;

function isEmptyCell(cell) {
  return !cell || (!cell.textContent.trim() && !cell.querySelector('picture, img'));
}

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const picture = img.closest('picture');
    const isSlideImage = !!img.closest('.carousel-promo-slide-image');
    picture.replaceWith(createOptimizedPicture(img.src, img.alt, false, isSlideImage
      ? [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]
      : [{ width: '400' }]));
  });
}

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;
  block.querySelectorAll('.carousel-promo-slide').forEach((slide, idx) => {
    const active = idx === slideIndex;
    slide.setAttribute('aria-hidden', String(!active));
    slide.classList.toggle('carousel-promo-slide-active', active);
    slide.querySelectorAll('a, button').forEach((el) => {
      if (active) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  });
  block.querySelectorAll('.carousel-promo-slide-indicator button').forEach((button, idx) => {
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
  const slides = block.querySelectorAll('.carousel-promo-slide');
  if (!slides.length) return;
  const index = ((slideIndex % slides.length) + slides.length) % slides.length;
  const track = block.querySelector('.carousel-promo-slides');
  track.scrollTo({ top: 0, left: slides[index].offsetLeft, behavior: 'smooth' });
  updateActiveSlide(block, index);
}

function currentIndex(block) {
  return parseInt(block.dataset.activeSlide || '0', 10);
}

function bindEvents(block) {
  let timer;
  const stop = () => { clearInterval(timer); timer = undefined; };
  const start = () => {
    stop();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(() => showSlide(block, currentIndex(block) + 1), AUTOPLAY_MS);
  };

  block.querySelectorAll('.carousel-promo-slide-indicator button').forEach((button, idx) => {
    button.addEventListener('click', () => { stop(); showSlide(block, idx); });
  });
  block.querySelector('.carousel-promo-prev').addEventListener('click', () => {
    stop();
    showSlide(block, currentIndex(block) - 1);
  });
  block.querySelector('.carousel-promo-next').addEventListener('click', () => {
    stop();
    showSlide(block, currentIndex(block) + 1);
  });

  // keep indicators in sync with touch/trackpad scrolling
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { root: block.querySelector('.carousel-promo-slides'), threshold: 0.6 });
  block.querySelectorAll('.carousel-promo-slide').forEach((slide) => observer.observe(slide));

  block.addEventListener('mouseenter', stop);
  block.addEventListener('focusin', stop);
  block.addEventListener('mouseleave', start);
  start();
}

function createSlide(row, idx, id) {
  const slide = document.createElement('li');
  slide.className = 'carousel-promo-slide';
  slide.dataset.slideIndex = idx;
  slide.id = `carousel-promo-${id}-slide-${idx}`;
  slide.setAttribute('aria-roledescription', 'slide');

  const cells = [...row.children];
  // image cell: first cell holding a picture; fall back to the first cell
  const imageCell = cells.find((c) => c.querySelector('picture, img')) || cells[0];
  const contentCells = cells.filter((c) => c !== imageCell && !isEmptyCell(c));

  if (imageCell && !isEmptyCell(imageCell)) {
    imageCell.className = 'carousel-promo-slide-image';
    slide.append(imageCell);
  }

  if (contentCells.length) {
    const content = document.createElement('div');
    content.className = 'carousel-promo-slide-content';
    contentCells.forEach((c) => content.append(...c.childNodes));
    slide.append(content);
    slide.classList.add('carousel-promo-slide-has-content');
  } else {
    slide.classList.add('carousel-promo-slide-image-only');
  }

  const heading = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.id) slide.setAttribute('aria-labelledby', heading.id);
  else slide.setAttribute('aria-label', `Slide ${idx + 1}`);

  return slide;
}

export default function decorate(block) {
  carouselId += 1;
  const id = carouselId;
  block.id = block.id || `carousel-promo-${id}`;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const rows = [...block.children].filter((row) => [...row.children].some((c) => !isEmptyCell(c)));
  const isSingle = rows.length < 2;

  const container = document.createElement('div');
  container.className = 'carousel-promo-slides-container';
  const track = document.createElement('ul');
  track.className = 'carousel-promo-slides';
  rows.forEach((row, idx) => track.append(createSlide(row, idx, id)));
  container.append(track);
  optimizePictures(track);

  block.replaceChildren(container);
  if (isSingle) {
    block.classList.add('carousel-promo-single');
    updateActiveSlide(block, 0);
    return;
  }

  // control bar below the slides: prev arrow, dot indicators, next arrow
  const controls = document.createElement('div');
  controls.className = 'carousel-promo-controls';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-promo-prev';
  prev.setAttribute('aria-label', 'Previous slide');
  track.id = `carousel-promo-${id}-slides`;
  prev.setAttribute('aria-controls', track.id);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Carousel slide controls');
  const indicators = document.createElement('ol');
  indicators.className = 'carousel-promo-slide-indicators';
  rows.forEach((_, idx) => {
    const li = document.createElement('li');
    li.className = 'carousel-promo-slide-indicator';
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show slide ${idx + 1} of ${rows.length}`);
    li.append(button);
    indicators.append(li);
  });
  nav.append(indicators);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-promo-next';
  next.setAttribute('aria-label', 'Next slide');
  next.setAttribute('aria-controls', track.id);

  controls.append(prev, nav, next);
  block.append(controls);

  updateActiveSlide(block, 0);
  bindEvents(block);
}
