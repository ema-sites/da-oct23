/* eslint-disable */
/* global WebImporter */

import carouselPromoParser from './parsers/carousel-promo.js';
import carouselWinnersParser from './parsers/carousel-winners.js';
import cardsGameTileParser from './parsers/cards-game-tile.js';
import alcCleanupTransformer from './transformers/alc-cleanup.js';
import alcSectionsTransformer from './transformers/alc-sections.js';

const PAGE_TEMPLATE = {
  "name": "alc",
  "urls": [
    "https://www.alc.ca/content/alc/en.html"
  ],
  "representativeUrl": "https://www.alc.ca/content/alc/en.html",
  "description": "ALC home page: hero promo carousel, recent winners carousel, featured games grid with right-rail promos",
  "urlPattern": "/content/alc/*",
  "blocks": [
    {
      "name": "carousel-promo",
      "instances": [
        "div.carousel.list.parbase.hero",
        ".alc-carousel"
      ]
    },
    {
      "name": "carousel-winners",
      "instances": [
        ".winners-carousel",
        ".winners_carousel"
      ]
    },
    {
      "name": "cards-game-tile",
      "instances": [
        ".cmp-container--game-tiles"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1",
      "name": "Hero promo carousel",
      "selector": [
        "div.carousel.list.parbase.hero"
      ],
      "style": null,
      "blocks": [
        "carousel-promo"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2",
      "name": "Recent winners heading bar",
      "selector": [
        ".cmp-section-header--alc-blue"
      ],
      "style": "blue",
      "blocks": [],
      "defaultContent": [
        ".cmp-section-header--alc-blue h2"
      ]
    },
    {
      "id": "section-3",
      "name": "Recent winners carousel",
      "selector": [
        "div.reference.parbase:has(.winners-carousel)",
        ".winners-carousel"
      ],
      "style": null,
      "blocks": [
        "carousel-winners"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4",
      "name": "Featured games heading bar",
      "selector": [
        ".cmp-section-header--alc-green"
      ],
      "style": "green",
      "blocks": [],
      "defaultContent": [
        ".cmp-section-header--alc-green h2"
      ]
    },
    {
      "id": "section-5",
      "name": "Featured games grid with right-rail promos",
      "selector": [
        "main.alc-container.cmp-container--fixed",
        ".cmp-container--show-column-gutters"
      ],
      "style": "split",
      "blocks": [
        "cards-game-tile"
      ],
      "defaultContent": [
        ".cmp-container--hide-column-gutters .cmp-image"
      ]
    }
  ]
};

const parsers = {
  'carousel-promo': carouselPromoParser,
  'carousel-winners': carouselWinnersParser,
  'cards-game-tile': cardsGameTileParser,
};
const transformers = [alcCleanupTransformer, alcSectionsTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
