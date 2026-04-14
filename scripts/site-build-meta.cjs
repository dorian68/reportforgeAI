const marketingSiteTitle = "ReportForge AI | Excel-Native Reporting Copilot";
const marketingSiteDescription =
  "Turn raw Excel ranges into dashboards, decks, Apps Script web apps, and decision-ready reporting assets with ReportForge AI.";

function normalizeValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBaseUrl(url, fallbackUrl = "https://localhost:3000/") {
  const normalized = normalizeValue(url);
  if (!normalized) {
    return fallbackUrl;
  }

  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function buildMarketingSiteMeta(baseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const canonicalUrl = new URL("site.html", normalizedBaseUrl).toString();
  const ogImageUrl = new URL("assets/reportforge-store-banner-01.png", normalizedBaseUrl).toString();

  return {
    title: marketingSiteTitle,
    description: marketingSiteDescription,
    canonicalUrl,
    ogImageUrl,
    themeColor: "#15736b",
    structuredData: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ReportForge AI",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Windows, macOS, Web",
      description: marketingSiteDescription,
      url: canonicalUrl,
      image: ogImageUrl,
      offers: [
        { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Pro", price: "39", priceCurrency: "USD" },
        { "@type": "Offer", name: "Team", price: "249", priceCurrency: "USD" },
      ],
    }),
  };
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeJsonForHtml(value) {
  return String(value).replace(/</g, "\\u003c");
}

function applySiteMetaTemplate(html, siteMeta) {
  return html
    .replaceAll("<%= htmlWebpackPlugin.options.siteMeta.title %>", escapeHtmlAttribute(siteMeta.title))
    .replaceAll(
      "<%= htmlWebpackPlugin.options.siteMeta.description %>",
      escapeHtmlAttribute(siteMeta.description)
    )
    .replaceAll(
      "<%= htmlWebpackPlugin.options.siteMeta.themeColor %>",
      escapeHtmlAttribute(siteMeta.themeColor)
    )
    .replaceAll(
      "<%= htmlWebpackPlugin.options.siteMeta.canonicalUrl %>",
      escapeHtmlAttribute(siteMeta.canonicalUrl)
    )
    .replaceAll(
      "<%= htmlWebpackPlugin.options.siteMeta.ogImageUrl %>",
      escapeHtmlAttribute(siteMeta.ogImageUrl)
    )
    .replaceAll(
      "<%= htmlWebpackPlugin.options.siteMeta.structuredData %>",
      escapeJsonForHtml(siteMeta.structuredData)
    );
}

module.exports = {
  buildMarketingSiteMeta,
  marketingSiteDescription,
  marketingSiteTitle,
  normalizeBaseUrl,
  applySiteMetaTemplate,
};
