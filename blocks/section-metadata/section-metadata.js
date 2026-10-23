import { readBlockConfig, toCamelCase, toClassName } from '../../scripts/aem.js';

/**
 * Applies section metadata to the enclosing section, then removes the block.
 * `style` values become section classes; other keys become data attributes.
 * @param {Element} block The section-metadata block element
 */
export default function decorate(block) {
  const section = block.closest('.section');
  const wrapper = block.closest('.section-metadata-wrapper');
  if (section) {
    const config = readBlockConfig(block);
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'style') {
        const styles = (Array.isArray(value) ? value : String(value).split(','))
          .map((style) => toClassName(style.trim()))
          .filter(Boolean);
        section.classList.add(...styles);
      } else if (value) {
        section.dataset[toCamelCase(key)] = value;
      }
    });
    section.classList.remove('section-metadata-container');
  }
  (wrapper || block).remove();
}
