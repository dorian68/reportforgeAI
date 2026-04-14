function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function buildCorsHeaders(request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizePayload(payload) {
  return {
    source: normalize(payload.source) || "reportforge-marketing-site",
    submittedAt: normalize(payload.submittedAt) || new Date().toISOString(),
    fullName: normalize(payload.fullName),
    workEmail: normalize(payload.workEmail),
    company: normalize(payload.company),
    teamSize: normalize(payload.teamSize),
    selectedPlan: normalize(payload.selectedPlan),
    useCase: normalize(payload.useCase),
    notes: normalize(payload.notes),
    brief: normalize(payload.brief),
    pageUrl: normalize(payload.pageUrl),
    userAgent: normalize(payload.userAgent),
  };
}

function validateLead(lead) {
  const missingFields = ["fullName", "workEmail", "company", "selectedPlan", "useCase"].filter(
    (field) => !normalize(lead[field])
  );

  if (missingFields.length > 0) {
    return `Missing required lead fields: ${missingFields.join(", ")}.`;
  }

  if (!/\S+@\S+\.\S+/.test(lead.workEmail)) {
    return "A valid work email is required.";
  }

  return "";
}

async function forwardLead(lead, env) {
  const webhookUrl = normalize(env.REPORTFORGE_LEAD_WEBHOOK_URL);
  if (!webhookUrl) {
    console.log("[reportforge] Marketing lead captured without downstream webhook.", {
      fullName: lead.fullName,
      workEmail: lead.workEmail,
      company: lead.company,
      selectedPlan: lead.selectedPlan,
      useCase: lead.useCase,
    });
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "ReportForge-Lead-Proxy",
    },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(details || "Lead webhook rejected the request.");
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(context.request),
  });
}

export async function onRequestPost(context) {
  const corsHeaders = buildCorsHeaders(context.request);

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json(
      { message: "Lead capture expects a JSON request body." },
      { status: 400, headers: corsHeaders }
    );
  }

  const lead = sanitizePayload(payload || {});
  const validationError = validateLead(lead);
  if (validationError) {
    return json({ message: validationError }, { status: 400, headers: corsHeaders });
  }

  try {
    await forwardLead(lead, context.env || {});
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "Lead forwarding failed.",
      },
      { status: 502, headers: corsHeaders }
    );
  }

  return json(
    {
      message: "Launch request submitted. We will follow up soon.",
    },
    { status: 202, headers: corsHeaders }
  );
}
