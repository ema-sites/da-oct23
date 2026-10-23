// media query match that indicates desktop width
const isDesktop = window.matchMedia('(width >= 900px)');

/**
 * Fetches the nav fragment. Metadata-independent dual fetch:
 * /content/nav.plain.html (local aem up), then /nav.plain.html (DA/EDS).
 * Relative media references are resolved against the URL the fragment was
 * actually served from, so images/x.png works locally and in production.
 * @returns {Promise<HTMLElement|null>} body element holding the fragment sections
 */
async function fetchNavFragment() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const html = await resp.text();
  const base = resp.url || window.location.href;
  // DOMParser documents do not load images, so src can be fixed before adoption
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', new URL(img.getAttribute('src'), base).href);
  });
  doc.querySelectorAll('source[srcset]').forEach((source) => {
    const srcset = source.getAttribute('srcset').split(',').map((entry) => {
      const [url, descriptor] = entry.trim().split(/\s+/);
      return [new URL(url, base).href, descriptor].filter(Boolean).join(' ');
    }).join(', ');
    source.setAttribute('srcset', srcset);
  });
  // the published fragment wraps list-item links/media in <p>; unwrap so
  // local and production markup share one shape (li > a, li > picture)
  doc.querySelectorAll('li > p').forEach((p) => {
    const [only] = p.children;
    const hasText = [...p.childNodes]
      .some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (p.children.length === 1 && !hasText && ['A', 'PICTURE', 'IMG'].includes(only.tagName)) {
      p.replaceWith(only);
    }
  });
  return doc.body;
}

/**
 * Turns a string into a class-name safe slug.
 * @param {string} text the text
 * @returns {string} slug
 */
function toSlug(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Returns the image (or its picture wrapper) for a media element.
 * @param {Element} img img element
 * @returns {Element} picture or img
 */
function mediaNode(img) {
  return img.closest('picture') || img;
}

/**
 * Replaces an image inside a link with a CSS-rendered icon span.
 * The image URL is passed via the --nav-icon custom property; header.css
 * decides whether it is painted as a background or as a currentColor mask.
 * @param {Element} img image element
 * @returns {Element} icon span
 */
function imageToIcon(img) {
  const icon = document.createElement('span');
  icon.className = 'nav-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.setProperty('--nav-icon', `url("${img.src}")`);
  mediaNode(img).replaceWith(icon);
  return icon;
}

/**
 * Wraps the bare text nodes of an element in a label span.
 * @param {Element} el element
 * @param {string} className class for the label span
 * @returns {Element|null} label span
 */
function wrapLabel(el, className = 'nav-label') {
  const text = [...el.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (!text.length) return null;
  const label = document.createElement('span');
  label.className = className;
  label.textContent = text.map((n) => n.textContent.trim()).join(' ');
  text[0].replaceWith(label);
  text.slice(1).forEach((n) => n.remove());
  [...el.childNodes].forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()) n.remove();
  });
  return label;
}

/**
 * Decorates a link that carries text plus an optional inline image (icon).
 * @param {Element} link anchor
 */
function decorateIconLink(link) {
  const img = link.querySelector('img');
  if (img) {
    link.classList.add('has-icon');
    imageToIcon(img);
  }
  wrapLabel(link);
}

/**
 * Authors cannot set link targets in documents; a trailing #_blank hash
 * opens the link in a new tab.
 * @param {Element} root container
 */
function decorateLinkTargets(root) {
  root.querySelectorAll('a[href$="#_blank"]').forEach((a) => {
    a.setAttribute('href', a.getAttribute('href').replace(/#_blank$/, ''));
    a.target = '_blank';
    a.rel = 'noopener';
  });
}

/**
 * Builds a search form from an authored search link.
 * Link text becomes the placeholder, the link image the submit icon and
 * its alt text the accessible label; the first query parameter names the field.
 * @param {Element} link anchor pointing to the search results page
 * @returns {Element} form
 */
function buildSearch(link) {
  const url = new URL(link.href);
  const img = link.querySelector('img');
  const labelText = (img && img.alt) || link.title || '';
  const fieldName = [...url.searchParams.keys()][0] || 'q';
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.action = url.pathname;
  form.method = 'get';
  form.setAttribute('role', 'search');

  const inputId = 'nav-search-field';
  const label = document.createElement('label');
  label.className = 'nav-sr-only';
  label.htmlFor = inputId;
  label.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'text';
  input.id = inputId;
  input.name = fieldName;
  input.maxLength = 2048;
  input.placeholder = link.textContent.trim();

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  if (labelText) submit.setAttribute('aria-label', labelText);
  if (img) submit.style.setProperty('--nav-icon', `url("${img.src}")`);

  form.append(label, input, submit);
  return form;
}

/**
 * Decorates the brand / utility bar (first section of the fragment).
 * Logo = first image link, search = link to a search page,
 * lists = utility links, remaining links = call to action.
 * @param {Element} section brand section
 */
function decorateBrand(section) {
  let logoFound = false;
  [...section.children].forEach((child) => {
    const link = child.querySelector('a');
    if (child.tagName === 'UL') {
      child.classList.add('nav-utility');
      child.querySelectorAll(':scope > li').forEach((li) => {
        const a = li.querySelector('a');
        if (!a) return;
        li.classList.add(`nav-utility-${toSlug(a.textContent)}`);
        decorateIconLink(a);
      });
      return;
    }
    if (!link) return;
    if (!logoFound && link.querySelector('img')) {
      logoFound = true;
      child.classList.add('nav-logo');
      link.classList.add('nav-logo-link');
      // the link text is the accessible name; the image is presentational
      if (wrapLabel(link, 'nav-sr-only')) link.querySelector('img').alt = '';
      return;
    }
    if (/search/i.test(new URL(link.href).pathname)) {
      child.classList.add('nav-search-wrapper');
      child.replaceChildren(buildSearch(link));
      return;
    }
    child.classList.add('nav-cta');
    link.classList.add('nav-cta-link');
    decorateIconLink(link);
  });
}

/**
 * Builds one megamenu tile from an authored list item:
 * - label link + nested list (image + call-to-action links) = image card
 * - link wrapping an image only = promotional tile
 * @param {Element} li list item
 * @returns {Element} tile list item
 */
function buildTile(li) {
  const label = li.querySelector(':scope > a');
  const nested = li.querySelector(':scope > ul');
  const tile = document.createElement('li');
  tile.className = 'nav-tile';

  if (label.querySelector('img') && !label.textContent.trim()) {
    tile.classList.add('nav-tile-promo');
    label.classList.add('nav-tile-media');
    tile.append(label);
    return tile;
  }

  const media = document.createElement('a');
  media.className = 'nav-tile-media';
  media.setAttribute('href', label.getAttribute('href'));
  const img = nested && [...nested.querySelectorAll('img')].find((i) => !i.closest('a'));
  if (img) {
    if (!img.alt) img.alt = label.textContent.trim();
    media.append(mediaNode(img));
  } else {
    media.textContent = label.textContent.trim();
  }
  tile.append(media);

  if (nested) {
    nested.querySelectorAll('a').forEach((a) => {
      a.classList.add('nav-tile-cta');
      decorateIconLink(a);
      tile.append(a);
    });
  }
  return tile;
}

/**
 * Builds a side rail from an authored group (non-link label + link list).
 * An image placed directly in the group becomes the rail background.
 * @param {Element} li list item
 * @returns {Element} rail
 */
function buildRail(li) {
  const rail = document.createElement('div');
  rail.className = 'nav-rail';
  const list = li.querySelector(':scope > ul');
  const title = document.createElement('p');
  title.className = 'nav-rail-title';
  title.textContent = [...li.childNodes]
    .filter((n) => n !== list && !(n.querySelector && n.querySelector('img')))
    .map((n) => n.textContent.trim())
    .filter(Boolean)
    .join(' ');
  if (title.textContent) rail.append(title);
  if (list) {
    list.className = 'nav-rail-links';
    rail.append(list);
  }
  [...li.querySelectorAll('img')].filter((img) => !list || !list.contains(img)).forEach((img) => {
    rail.style.setProperty('--nav-rail-bg', `url("${img.src}")`);
    rail.classList.add('has-background');
  });
  return rail;
}

/**
 * Builds a megamenu panel from the nested list of a top-level nav item.
 * @param {Element} subList nested list
 * @param {string} id panel id
 * @returns {Element} panel
 */
function buildMegamenu(subList, id) {
  const panel = document.createElement('div');
  panel.className = 'nav-megamenu';
  panel.id = id;
  const tiles = document.createElement('ul');
  tiles.className = 'nav-tiles';
  const rails = [];
  [...subList.children].forEach((li) => {
    if (li.querySelector(':scope > a')) tiles.append(buildTile(li));
    else rails.push(buildRail(li));
  });
  if (tiles.children.length) panel.append(tiles);
  panel.append(...rails);
  return panel;
}

/**
 * Collapses every open megamenu.
 * Reads state from the DOM so externally toggled triggers are closed too.
 * @param {Element} nav nav element
 * @param {Element} [except] trigger to leave untouched
 */
function closeAllPanels(nav, except = null) {
  nav.querySelectorAll('.nav-trigger[aria-expanded="true"]').forEach((trigger) => {
    if (trigger !== except) trigger.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Toggles the mobile menu.
 * @param {Element} nav nav element
 * @param {boolean|null} forceExpanded force state
 */
function toggleMenu(nav, forceExpanded = null) {
  const button = nav.querySelector('.nav-hamburger button');
  if (isDesktop.matches) {
    nav.removeAttribute('aria-expanded');
    document.body.style.overflowY = '';
    if (button) button.setAttribute('aria-label', 'Open navigation');
    return;
  }
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  document.body.style.overflowY = expanded ? '' : 'hidden';
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  if (expanded) closeAllPanels(nav);
}

/**
 * Decorates the primary navigation (second section of the fragment).
 * Items with a nested list become click-triggered megamenus.
 * @param {Element} section nav section
 * @param {Element} nav nav element
 */
function decorateSections(section, nav) {
  const list = section.querySelector(':scope > ul');
  if (!list) return;
  list.classList.add('nav-items');
  [...list.children].forEach((li, idx) => {
    li.classList.add('nav-item');
    const link = li.querySelector(':scope > a');
    const subList = li.querySelector(':scope > ul');
    if (!subList) {
      if (link) link.classList.add('nav-link');
      return;
    }
    li.classList.add('nav-drop');
    const panelId = `nav-megamenu-${idx + 1}`;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nav-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panelId);
    trigger.textContent = (link ? link.textContent : li.firstChild.textContent).trim();
    const caret = document.createElement('span');
    caret.className = 'nav-caret';
    caret.setAttribute('aria-hidden', 'true');
    trigger.append(caret);
    const panel = buildMegamenu(subList, panelId);
    li.replaceChildren(trigger, panel);

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      closeAllPanels(nav, trigger);
      trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  });
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNavFragment();
  block.textContent = '';
  if (!fragment) return;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  const sections = [...fragment.children].filter((el) => el.tagName === 'DIV');
  const classes = ['brand', 'sections', 'tools'];
  sections.forEach((section, i) => {
    section.classList.add(`nav-${classes[i] || 'tools'}`);
    nav.append(section);
  });
  decorateLinkTargets(nav);

  const brand = nav.querySelector('.nav-brand');
  if (brand) decorateBrand(brand);
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) decorateSections(navSections, nav);

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav));
  nav.prepend(hamburger);
  toggleMenu(nav, false);

  // megamenus close on outside click and on Escape (no hover behaviour)
  document.addEventListener('click', (e) => {
    const openDrop = e.target.closest && e.target.closest('.nav-drop');
    const openTrigger = openDrop && openDrop.querySelector('.nav-trigger[aria-expanded="true"]');
    closeAllPanels(nav, openTrigger);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = nav.querySelector('.nav-trigger[aria-expanded="true"]');
    if (open) {
      closeAllPanels(nav);
      if (nav.contains(document.activeElement)) open.focus();
    } else if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      toggleMenu(nav, false);
      nav.querySelector('.nav-hamburger button').focus();
    }
  });

  // reset state when crossing the desktop breakpoint
  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    toggleMenu(nav, false);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
