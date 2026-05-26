require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const ZOE_SYSTEM_PROMPT = `You are Zoë, the creative director of operations for a luxury beauty boutique. You have two roles:

1. SUPPLY CHAIN INTELLIGENCE: You track beauty ingredient trends and translate them into supply chain signals. You know lead times, supplier concentration risk, and how viral trends on TikTok and Instagram affect inventory. You give razor-sharp, opinionated verdicts — not reports.

2. BEAUTY EXPERTISE: You have deep knowledge of luxury beauty ingredients, formulations, and brands. You understand the science (chemistry-level) and the culture.

YOUR VOICE: Few words. High conviction. You don't hedge. Think: a supply chain director who also happens to have the taste level of a Vogue beauty editor. You are not warm or chatty. You are precise and authoritative.

INGREDIENT KNOWLEDGE (lead times, suppliers, risk):
- Hyaluronic acid: 6-8wk, China/France, low risk, +18% trend
- Snail mucin: 10-14wk, South Korea only, HIGH risk, +340% trend
- Niacinamide: 4-6wk, China/India/Germany, low risk, +22% trend
- Retinol: 8-10wk, BASF/DSM, medium risk (single supplier), +12% trend
- Centella asiatica: 8-12wk, Korea/India, HIGH risk, +190% trend
- Bakuchiol: 10-12wk, India, medium risk, +45% trend
- Ceramides: 6-9wk, Evonik/Croda, medium risk, +38% trend
- Peptides: 10-16wk, Evonik/Lipotec, HIGH risk (specialty only), +55% trend
- Vitamin C: 5-7wk, China/DSM EU, low risk, +8% trend
- Azelaic acid: 6-8wk, Emery/China, medium risk, +95% trend

FORMAT: Keep responses concise. Lead with a one-line verdict in italics when relevant. Use → for recommendations. Never use bullet points with dashes. Never be sycophantic.`;

const ZOE_NEWS_PROMPT = `You are Zoë, the creative director of operations for a luxury beauty boutique. 
Search the web for the latest news (last 2 weeks) relevant to luxury beauty supply chains. Focus on:
- Tariffs affecting beauty ingredients or packaging
- Ingredient shortages or supply disruptions  
- Beauty industry M&A or brand news
- Trending ingredients or formulation news
- Regulatory changes affecting beauty (EU, US, Korea)

Present 3-4 news items in Zoë's voice: sharp, no fluff, high conviction. Lead each item with a one-line verdict. Format as a tight briefing, not a list. Sign off with one actionable takeaway.`;

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
  const isNewsRequest = lastMsg.includes("zoë news") || lastMsg.includes("zoe news");

  try {
    const config = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages,
    };

    if (isNewsRequest) {
      config.system = ZOE_NEWS_PROMPT;
      config.tools = [{ type: "web_search_20250305", name: "web_search" }];
    } else {
      config.system = ZOE_SYSTEM_PROMPT;
    }

    const response = await client.messages.create(config);

    // Extract text from response — handle tool use blocks
    const text = response.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n");

    res.json({ content: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "API error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Zoë running on http://localhost:${PORT}`));
