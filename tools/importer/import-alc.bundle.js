/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-alc.js
  var import_alc_exports = {};
  __export(import_alc_exports, {
    default: () => import_alc_default
  });

  // tools/importer/parsers/carousel-promo.js
  function parse(element, { document }) {
    const cells = [];
    const text = (el) => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    const para = (value) => {
      const p = document.createElement("p");
      p.textContent = value;
      return p;
    };
    const cloneImg = (img) => {
      if (!img) return null;
      const out = document.createElement("img");
      out.src = img.getAttribute("src") || img.src || "";
      out.alt = img.getAttribute("alt") || "";
      return out;
    };
    const bgImage = (container) => {
      if (!container) return null;
      const direct = container.querySelector(":scope > img");
      if (direct) return cloneImg(direct);
      let src = container.getAttribute("data-bgimage") || "";
      if (!src) {
        const style = container.getAttribute("style") || "";
        const m = style.match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
        if (m) src = m[1];
      }
      if (!src) {
        const spans = [...container.querySelectorAll(":scope > span[data-src]")];
        if (spans.length) src = spans[spans.length - 1].getAttribute("data-src");
      }
      if (!src) {
        const anyImg = container.querySelector("img");
        if (anyImg) return cloneImg(anyImg);
        return null;
      }
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      return img;
    };
    const slides = element.querySelectorAll("ul.slides > li.slide");
    slides.forEach((slide) => {
      const draw = slide.querySelector(".alc-external-data");
      const promo = slide.querySelector("article.fca-carousel-slide-promo");
      if (draw) {
        const bgImg = bgImage(draw);
        const content = [];
        const logo = cloneImg(draw.querySelector(".draw__logo img"));
        if (logo) content.push(logo);
        const nextDraw = text(draw.querySelector('[class*="nextDraw"] label'));
        if (nextDraw) content.push(para(nextDraw));
        const bannerLabels = [...draw.querySelectorAll('[class*="__banner__contents"] > label')].map((l) => text(l)).filter(Boolean);
        if (bannerLabels.length) {
          content.push(para(bannerLabels.join(" ").replace(/^\$\s+/, "$")));
        }
        const groupDigits = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        let amountDigits = text(draw.querySelector(".draw__prize-amount")).replace(/\D/g, "");
        if (!amountDigits) {
          const holder = draw.hasAttribute("data-response") ? draw : draw.querySelector("[data-response]") || slide.querySelector("[data-response]");
          try {
            const data = holder && JSON.parse(holder.getAttribute("data-response"));
            const jackpot = data && data.primaryDraw && data.primaryDraw.next_draw && data.primaryDraw.next_draw.jackpot;
            if (jackpot !== void 0 && jackpot !== null && jackpot !== "") {
              const n = Math.round(Number(jackpot));
              if (Number.isFinite(n) && n > 0) amountDigits = String(n);
            }
          } catch (e) {
          }
        }
        if (amountDigits) content.push(para(`$${groupDigits(amountDigits)}`));
        const goldLabel = draw.querySelector('[class*="goldball__jackpot"] label');
        if (goldLabel) {
          const gradient = goldLabel.querySelector('[class*="__gradient"]');
          let gold = "";
          goldLabel.childNodes.forEach((n) => {
            if (n === gradient) gold += text(n) || "O";
            else gold += n.textContent;
          });
          gold = gold.replace(/\s+/g, " ").trim().replace(/^G\s*O\s*LD\b/, "GOLD");
          if (gold) content.push(para(gold));
        }
        const guaranteed = text(draw.querySelector('[class*="goldball__guaranteed"] label'));
        if (guaranteed) content.push(para(guaranteed));
        const cta = draw.querySelector(".draw__cta a[href]");
        if (cta) {
          const a = document.createElement("a");
          a.href = cta.getAttribute("href");
          a.textContent = text(cta);
          const p = document.createElement("p");
          p.append(a);
          content.push(p);
        }
        cells.push([bgImg || "", content.length ? content : ""]);
        return;
      }
      if (promo) {
        const img2 = bgImage(promo.querySelector(".slide-content") || promo);
        const link = promo.querySelector("a[href]");
        let imageCell = img2 || "";
        if (img2 && link) {
          const a = document.createElement("a");
          a.href = link.getAttribute("href");
          a.append(img2);
          imageCell = a;
        }
        cells.push([imageCell, ""]);
        return;
      }
      const img = cloneImg(slide.querySelector("img"));
      if (img) cells.push([img, ""]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-winners.js
  function parse2(element, { document }) {
    const cells = [];
    const DEFAULT_BG = "/content/dam/alc/images/static/winners-carousel/winners-carousel-bg-generic.png";
    const text = (el) => el ? el.textContent.replace(/\s+/g, " ").trim() : "";
    const makeImg = (src, alt = "") => {
      if (!src) return null;
      const img = document.createElement("img");
      img.src = src;
      img.alt = alt;
      return img;
    };
    const cloneImg = (img) => img ? makeImg(img.getAttribute("src") || img.src, img.getAttribute("alt") || "") : null;
    const styleBg = (el) => {
      if (!el) return "";
      const style = el.getAttribute("style") || "";
      const m = style.match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
      return m ? encodeURI(decodeURI(m[1].trim())) : "";
    };
    let slides = [...element.querySelectorAll(".slick-slide:not(.slick-cloned) .slide")];
    if (!slides.length) slides = [...element.querySelectorAll(".slide")];
    slides.forEach((slide) => {
      const bgImg = cloneImg(slide.querySelector(":scope > img")) || makeImg(styleBg(slide)) || (slide.classList.contains("standard-bg") ? makeImg(DEFAULT_BG) : null);
      const content = [];
      const portraitEl = slide.querySelector(".winner-image");
      const portrait = cloneImg(portraitEl && portraitEl.querySelector("img")) || makeImg(styleBg(portraitEl));
      if (portrait) content.push(portrait);
      const info = slide.querySelector(".winner-info");
      const name = text(info && info.querySelector("h3, h2, h4"));
      if (name) {
        const h3 = document.createElement("h3");
        h3.textContent = name;
        content.push(h3);
      }
      const location = text(info && info.querySelector(".h2, span"));
      if (location) {
        const p = document.createElement("p");
        p.textContent = location;
        content.push(p);
      }
      const cta = info && info.querySelector("a[href]");
      if (cta) {
        const a = document.createElement("a");
        a.href = cta.getAttribute("href").replace(/\.html\.html(?=$|[?#])/, ".html");
        a.textContent = text(cta) || "See all winners";
        const p = document.createElement("p");
        p.append(a);
        content.push(p);
      }
      const prize = slide.querySelector(".prize-details");
      if (prize) {
        const logo = cloneImg(prize.querySelector(".winning-game-logo, .game-title img"));
        if (logo) content.push(logo);
        const ribbon = text(prize.querySelector(".winning-game-ribbon"));
        if (ribbon) {
          const p = document.createElement("p");
          p.textContent = ribbon;
          content.push(p);
        }
        const amountEl = prize.querySelector(".prize-amount");
        if (amountEl) {
          const raw = text(amountEl);
          const digits = raw.replace(/\D/g, "");
          const amount = digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : raw;
          if (amount) {
            const p = document.createElement("p");
            p.textContent = amount.startsWith("$") ? amount : `$${amount}`;
            content.push(p);
          }
        }
      }
      if (!bgImg && !content.length) return;
      cells.push([bgImg || "", content.length ? content : ""]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-winners", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-game-tile.js
  function parse3(element, { document }) {
    const cells = [];
    const clean = (s) => (s || "").replace(/[​-‍﻿]/g, "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
    const text = (el) => el ? clean(el.textContent) : "";
    const para = (value) => {
      const p = document.createElement("p");
      p.textContent = value;
      return p;
    };
    const makeImg = (src, alt = "") => {
      if (!src) return null;
      const img = document.createElement("img");
      img.src = src;
      img.alt = alt;
      return img;
    };
    const styleBg = (el) => {
      if (!el) return "";
      const style = el.getAttribute("style") || "";
      const m = style.match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
      return m ? m[1].trim() : "";
    };
    let tiles = [...element.querySelectorAll("div.game-tile.parbase > article.game-tile")];
    if (!tiles.length) tiles = [...element.querySelectorAll("article.game-tile")];
    tiles.forEach((tile) => {
      const imgContainer = tile.querySelector(".game-tile-image-container");
      const title = text(tile.querySelector(".game-tile-title"));
      let image = null;
      if (imgContainer) {
        const direct = imgContainer.querySelector(":scope > img");
        if (direct) image = makeImg(direct.getAttribute("src") || direct.src, direct.getAttribute("alt") || title);
        else image = makeImg(styleBg(imgContainer), title);
      }
      const content = [];
      const flag = imgContainer && imgContainer.querySelector(".game-flag");
      if (flag) {
        let flagText = text(flag);
        const key = flagText.match(/^\[([a-z]+)-[a-z]{2}\]$/i);
        if (key) flagText = key[1];
        if (!flagText && flag.classList.contains("new")) flagText = "new";
        if (flagText) content.push(para(flagText.toUpperCase()));
      }
      if (title) {
        const h3 = document.createElement("h3");
        h3.textContent = title;
        content.push(h3);
      }
      const desc = tile.querySelector(".game-tile-description");
      if (desc) {
        const ps = [...desc.querySelectorAll("p")];
        (ps.length ? ps : [desc]).forEach((src) => {
          if (!text(src)) return;
          const p = document.createElement("p");
          src.childNodes.forEach((n) => {
            if (n.nodeType === 3) {
              p.append(document.createTextNode(n.textContent.replace(/\s+/g, " ")));
            } else if (n.nodeType === 1 && n.tagName === "A" && n.getAttribute("href")) {
              const a = document.createElement("a");
              a.href = n.getAttribute("href");
              a.textContent = text(n);
              p.append(a);
            } else if (n.nodeType === 1) {
              p.append(document.createTextNode(n.textContent.replace(/\s+/g, " ")));
            }
          });
          content.push(p);
        });
      }
      const nextDate = tile.querySelector(".game-tile-content .next-jackpot-date");
      if (text(nextDate)) content.push(para(text(nextDate)));
      const nextPrize = tile.querySelector(".game-tile-content .next-jackpot-prize");
      if (text(nextPrize)) content.push(para(text(nextPrize)));
      const extraBar = imgContainer && imgContainer.querySelector(".max-plus-bar");
      if (text(extraBar)) {
        const barText = clean([...extraBar.childNodes].map((n) => n.textContent).join(" ")).replace(/(\d)\s*×/g, "$1 \xD7");
        content.push(para(barText));
      }
      tile.querySelectorAll(".game-tile-content .prize-info").forEach((pi) => {
        if (text(pi)) content.push(para(text(pi)));
      });
      const cta = tile.querySelector(".game-tile-content > a.button[href], .game-tile-content a.arrow-button[href]");
      if (cta) {
        const a = document.createElement("a");
        a.href = cta.getAttribute("href");
        a.textContent = text(cta);
        const p = document.createElement("p");
        p.append(a);
        content.push(p);
      }
      if (!image && !content.length) return;
      cells.push([image || "", content.length ? content : ""]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-game-tile", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/alc-cleanup.js
  var remove = (root, selectors) => {
    selectors.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el) => el.remove());
    });
  };
  function transform(hookName, element, payload) {
    if (hookName === "beforeTransform") {
      remove(element, [
        // Global header experience fragment (div) and footer experience fragment (footer)
        "div.experiencefragment.aem-GridColumn",
        "footer.experiencefragment.aem-GridColumn",
        ".cmp-experiencefragment--header",
        ".cmp-experiencefragment--footer",
        // Skip link
        ".cmp-page__skiptomaincontent",
        // Tracking containers (Qualtrics intercept, pixel iframes)
        "#ZN_3Eu2u7P45FmpwJ5",
        "iframe",
        // Empty / hidden html-promo container
        "div.html-promo.parbase",
        // Hidden mobile-app download banner in the right rail
        "div.banner:has(> .alc-mobile-banner)",
        ".alc-mobile-banner",
        // Modals
        ".common-modals",
        ".alc-modal",
        "#loginFlow",
        // Non-content elements
        "script",
        "style",
        "noscript",
        "link"
      ]);
      const body = element.ownerDocument ? element.ownerDocument.body : null;
      const scope = body || element;
      [...scope.children].forEach((child) => {
        if (child.tagName === "DIV" && !child.className && !child.id && !child.textContent.trim() && !child.querySelector("img, picture, a")) {
          child.remove();
        }
      });
    }
    if (hookName === "afterTransform") {
      remove(element, [
        "script",
        "style",
        "noscript",
        "link",
        "iframe"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        [...el.attributes].forEach(({ name }) => {
          if (name.startsWith("on") || name.startsWith("data-cmp-") || name.startsWith("data-analytics") || name.startsWith("data-track")) {
            el.removeAttribute(name);
          }
        });
      });
    }
  }

  // tools/importer/transformers/alc-sections.js
  var MARKER = "data-excat-section-id";
  var findSectionEl = (root, section) => {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    for (const sel of selectors) {
      if (!sel) continue;
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (e) {
      }
    }
    return null;
  };
  function transform2(hookName, element, payload) {
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;
    const document = element.ownerDocument || payload.document;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const el = findSectionEl(element, section);
        if (!el) continue;
        if (i === 0 && !section.style) continue;
        const hr = document.createElement("hr");
        if (section.style) hr.setAttribute(MARKER, section.id);
        el.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
        if (section.style) {
          const meta = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
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

  // tools/importer/import-alc.js
  var PAGE_TEMPLATE = {
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
  var parsers = {
    "carousel-promo": parse,
    "carousel-winners": parse2,
    "cards-game-tile": parse3
  };
  var transformers = [transform, transform2];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
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
  var import_alc_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }];
    }
  };
  return __toCommonJS(import_alc_exports);
})();
