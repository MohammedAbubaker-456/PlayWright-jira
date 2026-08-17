const { expect } = require("@playwright/test");

async function checkBadgeColor(
  page,
  badgeText,
  expectedBackgroundColor,
  expectedTextColor,
) {
  const badges = page
    .locator("span.sb-badge")
    .filter({
      hasText: new RegExp(`^\\s*${badgeText}\\s*$`),
    });

  const count = await badges.count();

  // If this particular status/priority does not exist on the page,
  // skip it instead of failing.
  if (count === 0) {
    console.log(`No "${badgeText}" badge found on this page.`);
    return;
  }

  console.log(`Checking ${count} "${badgeText}" badge(s)...`);

  // Convert HEX → RGB
  const normalizeColor = (color) => {
    if (!color.startsWith("#")) {
      return color;
    }

    let hex = color.substring(1);

    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const expectedBackground = normalizeColor(
    expectedBackgroundColor,
  );

  const expectedText = normalizeColor(
    expectedTextColor,
  );

  // Check every badge
  for (let i = 0; i < count; i++) {
    const badge = badges.nth(i);

    await expect(
      badge,
      `"${badgeText}" badge #${i + 1} should be visible`,
    ).toBeVisible();

    const actualColors = await badge.evaluate((element) => {
      const styles = window.getComputedStyle(element);

      return {
        backgroundColor: styles.backgroundColor,
        textColor: styles.color,
      };
    });

    expect(
      actualColors.backgroundColor,
      `"${badgeText}" badge #${i + 1} has incorrect background color`,
    ).toBe(expectedBackground);

    expect(
      actualColors.textColor,
      `"${badgeText}" badge #${i + 1} has incorrect text color`,
    ).toBe(expectedText);
  }
}

module.exports = {
  checkBadgeColor,
};