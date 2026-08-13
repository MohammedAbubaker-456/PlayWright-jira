const { test, expect } = require("@playwright/test");

export async function checkRegions(page, selector) {
  const regions = page.locator(selector);

  const boxes = await regions.evaluateAll((elements) =>
    elements.map((el) => {
      const rect = el.getBoundingClientRect();

      return {
        x: rect.x,
        y: rect.y,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    }),
  );

  // Check truncation
  for (const box of boxes) {
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth);
    expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight);
  }

  // Check overlapping
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];

      const overlap =
        a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;

      expect(overlap).toBe(false);
    }
  }
}
