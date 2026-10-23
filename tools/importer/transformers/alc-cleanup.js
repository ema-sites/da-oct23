/* eslint-disable */
/* global WebImporter */

/**
 * ALC cleanup transformer.
 * Removes non-authorable chrome from https://www.alc.ca pages.
 * All selectors come from migration-work/cleaned.html.
 */

const remove = (root, selectors) => {
  selectors.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  });
};

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    remove(element, [
      // Global header experience fragment (div) and footer experience fragment (footer)
      'div.experiencefragment.aem-GridColumn',
      'footer.experiencefragment.aem-GridColumn',
      '.cmp-experiencefragment--header',
      '.cmp-experiencefragment--footer',
      // Skip link
      '.cmp-page__skiptomaincontent',
      // Tracking containers (Qualtrics intercept, pixel iframes)
      '#ZN_3Eu2u7P45FmpwJ5',
      'iframe',
      // Empty / hidden html-promo container
      'div.html-promo.parbase',
      // Hidden mobile-app download banner in the right rail
      'div.banner:has(> .alc-mobile-banner)',
      '.alc-mobile-banner',
      // Modals
      '.common-modals',
      '.alc-modal',
      '#loginFlow',
      // Non-content elements
      'script',
      'style',
      'noscript',
      'link',
    ]);

    // Body-level wrapper divs left empty after iframe removal (tracking containers)
    const body = element.ownerDocument ? element.ownerDocument.body : null;
    const scope = body || element;
    [...scope.children].forEach((child) => {
      if (child.tagName === 'DIV' && !child.className && !child.id
        && !child.textContent.trim() && !child.querySelector('img, picture, a')) {
        child.remove();
      }
    });
  }

  if (hookName === 'afterTransform') {
    // Final sweep for anything re-introduced or missed
    remove(element, [
      'script',
      'style',
      'noscript',
      'link',
      'iframe',
    ]);

    // Strip tracking / event attributes (do not touch HTML comments)
    element.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach(({ name }) => {
        if (name.startsWith('on')
          || name.startsWith('data-cmp-')
          || name.startsWith('data-analytics')
          || name.startsWith('data-track')) {
          el.removeAttribute(name);
        }
      });
    });
  }
}
