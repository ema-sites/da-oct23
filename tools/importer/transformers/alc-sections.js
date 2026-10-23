/* eslint-disable */
/* global WebImporter */

/**
 * ALC sections transformer.
 * Uses payload.template.sections from tools/importer/page-templates.json.
 * beforeTransform: inserts <hr> section breaks (and markers for styled sections)
 *   while parser targets still exist.
 * afterTransform: inserts Section Metadata blocks for styled sections.
 */

const MARKER = 'data-excat-section-id';

const findSectionEl = (root, section) => {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // invalid selector in this environment, try next
    }
  }
  return null;
};

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  const document = element.ownerDocument || payload.document;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionEl(element, section);
      if (!el) continue;
      // First section gets a break only if styled (temporary marker, removed later)
      if (i === 0 && !section.style) continue;
      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(MARKER, section.id);
      el.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
      if (section.style) {
        const meta = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        const el = findSectionEl(element, section);
        if (el) {
          el.after(meta);
        } else if (marker) {
          marker.after(meta);
        }
      }
      if (marker) {
        if (i === 0) {
          marker.remove();
        } else {
          marker.removeAttribute(MARKER);
        }
      }
    }
  }
}
