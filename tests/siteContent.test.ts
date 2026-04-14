import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { applySiteMetaTemplate, buildMarketingSiteMeta } = require(
  path.resolve(__dirname, "..", "..", "scripts", "site-build-meta.cjs")
);

import {
  buildLaunchBrief,
  buildLaunchRequestPayload,
  buildSalesMailto,
  hasConfiguredLeadEndpoint,
  hasConfiguredSalesEmail,
  validateLaunchRequest,
} from "../src/site/leadCapture";
import { MarketingSite } from "../src/site/MarketingSite";
import { buildSiteRuntimeConfig } from "../src/site/runtimeConfig";
import { getRecommendedPricingTier, marketingSiteContent } from "../src/site/content";

test("marketing site content covers the commercial essentials", () => {
  assert.equal(marketingSiteContent.navigation.length >= 5, true);
  assert.equal(marketingSiteContent.tabs.length, 4);
  assert.equal(marketingSiteContent.signals.length >= 4, true);
  assert.equal(marketingSiteContent.outputs.items.length >= 5, true);
  assert.equal(marketingSiteContent.personas.items.length >= 6, true);
  assert.equal(marketingSiteContent.useCases.items.length >= 8, true);
  assert.equal(marketingSiteContent.storeShots.items.length >= 3, true);
  assert.equal(marketingSiteContent.faq.items.length >= 6, true);
  assert.equal(marketingSiteContent.leadCapture.teamSizes.length >= 5, true);
});

test("marketing site pricing keeps a single recommended expansion tier", () => {
  const recommended = marketingSiteContent.pricing.tiers.filter((tier) => tier.recommended);

  assert.equal(marketingSiteContent.pricing.tiers.length, 4);
  assert.equal(recommended.length, 1);
  assert.equal(getRecommendedPricingTier()?.name, "Team");
  assert.equal(marketingSiteContent.pricing.tiers.every((tier) => tier.features.length >= 4), true);
});

test("marketing site CTA targets are usable anchors or support links", () => {
  const ctas = [
    marketingSiteContent.hero.primaryCta.href,
    marketingSiteContent.hero.secondaryCta.href,
    marketingSiteContent.hero.tertiaryCta.href,
    marketingSiteContent.closing.primaryCta.href,
    marketingSiteContent.closing.secondaryCta.href,
    ...marketingSiteContent.pricing.tiers.map((tier) => tier.cta.href),
  ];

  assert.equal(
    ctas.every((href) => href.startsWith("#") || href === "support.html"),
    true
  );
});

test("marketing site navigation targets canonical anchors", () => {
  assert.equal(
    marketingSiteContent.tabs.every((tab) => tab.href.startsWith("#") && tab.sections.length >= 2),
    true
  );

  assert.equal(
    marketingSiteContent.navigation.every((item) => item.href.startsWith("#")),
    true
  );
});

test("marketing store screenshot entries point to concrete asset files", () => {
  assert.equal(
    marketingSiteContent.storeShots.items.every((shot) => shot.imageSrc.startsWith("assets/")),
    true
  );
});

test("marketing launch request no longer ships with a placeholder sales email", () => {
  assert.equal(marketingSiteContent.leadCapture.salesEmail.startsWith("replace-with-"), false);
});

test("marketing site can be server-rendered for prerendered output", () => {
  const markup = renderToStaticMarkup(React.createElement(MarketingSite));

  assert.equal(markup.includes("Excel in. Decision-ready reporting out."), true);
  assert.equal(markup.includes("Request a Pilot"), true);
  assert.equal(markup.includes("Workflow"), true);
  assert.equal(markup.includes("Built for reporting quality, not just summary text."), true);
});

test("marketing site runtime config exposes sales email and lead endpoint overrides", () => {
  const config = buildSiteRuntimeConfig({
    REPORTFORGE_SALES_EMAIL: "sales@example.com",
    REPORTFORGE_SITE_LEAD_ENDPOINT: "https://crm.example.com/reportforge/leads",
  });

  assert.equal(config.salesEmail, "sales@example.com");
  assert.equal(config.leadEndpoint, "https://crm.example.com/reportforge/leads");
});

test("lead capture helpers validate required fields and accept configured routes", () => {
  const invalid = validateLaunchRequest({
    fullName: "",
    workEmail: "not-an-email",
    company: "",
    teamSize: "2-5",
    selectedPlan: "",
    useCase: "",
    notes: "",
  });

  assert.equal(invalid.fullName, "Full name is required.");
  assert.equal(invalid.workEmail, "Enter a valid work email.");
  assert.equal(invalid.company, "Company is required.");
  assert.equal(invalid.selectedPlan, undefined);
  assert.equal(invalid.useCase, undefined);
  assert.equal(hasConfiguredSalesEmail("sales@example.com"), true);
  assert.equal(hasConfiguredLeadEndpoint("/api/reportforge/site/lead"), true);
});

test("lead capture helpers build a stable brief, payload, and sales mailto", () => {
  const form = {
    fullName: "Jane Smith",
    workEmail: "jane@company.com",
    company: "Acme Corp",
    teamSize: "6-20",
    selectedPlan: "Team",
    useCase: "Monthly executive review",
    notes: "Need a pilot next month.",
  };

  const brief = buildLaunchBrief(form);
  const payload = buildLaunchRequestPayload(form, {
    pageUrl: "https://addins.example.com/reportforge/site.html",
    userAgent: "TestAgent/1.0",
  });
  const mailto = buildSalesMailto(form, "sales@example.com");

  assert.equal(brief.includes("Plan: Team"), true);
  assert.equal(payload.source, "reportforge-marketing-site");
  assert.equal(payload.pageUrl, "https://addins.example.com/reportforge/site.html");
  assert.equal(payload.userAgent, "TestAgent/1.0");
  assert.equal(mailto.startsWith("mailto:sales@example.com?subject="), true);
});

test("marketing site build meta resolves SEO placeholders into concrete HTML", () => {
  const meta = buildMarketingSiteMeta("https://addins.example.com/reportforge/");
  const template =
    '<title><%= htmlWebpackPlugin.options.siteMeta.title %></title><meta name="description" content="<%= htmlWebpackPlugin.options.siteMeta.description %>"/><link rel="canonical" href="<%= htmlWebpackPlugin.options.siteMeta.canonicalUrl %>"/><script type="application/ld+json"><%= htmlWebpackPlugin.options.siteMeta.structuredData %></script>';
  const resolved = applySiteMetaTemplate(template, meta);

  assert.equal(resolved.includes("<%= htmlWebpackPlugin.options.siteMeta"), false);
  assert.equal(resolved.includes(meta.title), true);
  assert.equal(resolved.includes(meta.description), true);
  assert.equal(resolved.includes(meta.canonicalUrl), true);
  assert.equal(resolved.includes('"@type":"SoftwareApplication"'), true);
});
