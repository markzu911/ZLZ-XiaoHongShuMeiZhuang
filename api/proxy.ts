import express from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '20mb' }));

// CORS Support
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

const proxySaaS = async (req: express.Request, res: express.Response, path: string) => {
  try {
    const response = await axios({
      method: req.method as any,
      url: `http://aibigtree.com${path}`,
      params: req.query,
      data: req.body,
      headers: { 
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers['authorization'] || ''
      }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`SaaS Proxy Error (${path}):`, error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "SaaS Proxy failed" });
  }
};

// SaaS Endpoints
app.all("/api/tool/launch", (req, res) => proxySaaS(req, res, "/api/tool/launch"));
app.all("/api/tool/verify", (req, res) => proxySaaS(req, res, "/api/tool/verify"));
app.all("/api/tool/consume", (req, res) => proxySaaS(req, res, "/api/tool/consume"));
app.all("/api/upload/image", (req, res) => proxySaaS(req, res, "/api/upload/image"));
app.all("/api/upload/direct-token", (req, res) => proxySaaS(req, res, "/api/upload/direct-token"));
app.all("/api/upload/commit", (req, res) => proxySaaS(req, res, "/api/upload/commit"));
app.all("/api/coze/workflow", (req, res) => proxySaaS(req, res, "/api/coze/workflow"));

// Gemini Generation
app.post("/api/gemini", async (req, res) => {
  const { model, payload } = req.body;
  const { prompt, images } = payload;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured in Secrets.");
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    const parts: any[] = [{ text: prompt }];
    
    if (images && Array.isArray(images)) {
      images.forEach((img: string) => {
        const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      });
    }

    const response = await genAI.models.generateContent({
      model: model || "gemini-3-flash-preview",
      contents: { parts }
    });

    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
    res.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Analysis failed." });
  }
});

// GPT Generation
app.post("/api/generate-gpt", async (req, res) => {
  const { inputText, images, style, length } = req.body;

  try {
    let styleSpecificGuidelines = '';
    if (style === '干貨科普') {
      styleSpecificGuidelines = `
- Style: Educational Beauty Scientist (干货科普).
- Title: MUST use a viral hook combined with scientific curiosity (e.g., "别再交智商税了！XX成分你真的懂吗？", "求求了！护肤前先看这篇XX科普！", "大数据推给正在用XX的姐妹！").
- Body Structure: 1. Common problem/myth. 2. Scientific principle (Ingredient/Physiology). 3. Correct usage/solution. 4. Expected results.
- Tags: #干货科普 #成分党 #美妆科普 #护肤分享`;
    } else if (style === '真實種草') {
      styleSpecificGuidelines = `
- Style: Authentic Product Recommendation (真实种草).
- Title: MUST use a viral hook + emotional payoff (e.g., "真的绝了!XX我直接锁死!", "救命！XX好用到我直接哭了！", "家人们谁懂！XX真的太治豫了！").
- Body Templates (Follow one of these):
  1. 💖真心推荐！[产品名]太好用了！用了之后我真的惊呆了...强烈推荐给[人群]！
  2. 💖回购好几次！[产品名]真的太香！使用感优点真心好用...绝对值得种草！
  3. 终于找到宝藏💖[产品名]！[产品名]真的太适合[人群/问题]了...真实体验让人忍不住安利！
- Tags: #真实种草 #好物推荐 #美妆分享 #入股不亏`;
    } else if (style === '情緒渲染') {
      styleSpecificGuidelines = `
- Style: Emotional & Sensory (情绪渲染).
- Title: MUST use a viral hook + high emotional resonance (e.g., "救命！XX这效果，我直接爱死！", "家人们!XX我真的爱了!", "第一次用就心动！XX也太神了✨").
- Body Templates (Follow one of these):
  1. 第一次用就心动！[产品名]太神了✨...整个人都元气满满了！[效果/肤感]让人忍不住微笑！
  2. 🫧累了一天？[产品名]帮你放松肌肤💖...仿佛给自己一个小小的仪式感，[肤感/香味]真的让人放松。
  3. 🌸每天的小幸福：涂上[产品名]💖...让心情瞬间温柔，给生活一点小确幸。
- Tags: #情绪美妆 #治愈系 #沉浸式护肤 #氛围感`;
    } else {
      styleSpecificGuidelines = `
- Style: ${style} (Creative & Engaging).
- Title: Catchy viral hook using popular XHS slang.
- Body: Authentic tone, sensory details, emojis, and clear benefits.
- Tags: #美妆 #小红书推荐 #颜值好物`;
    }

    const prompt = `Role: You are a professional Little Red Book (Xiaohongshu/XHS) beauty influencer and marketing expert.
Task: Generate a high-performance marketing post for a BEAUTY/COSMETIC product.

Product Context:
${inputText}

Overall Guidelines:
1. Tone: Friendly, authentic, "Sisterly" (Muye/Buddy tone). Use lots of emojis.
2. Narrative: Solve a pain point (e.g., dullness, acne, makeup not sticking).
${styleSpecificGuidelines}

Word Count: ${length === '短文' ? 'Short/Concise (approx 150-300 chars)' : 'Detailed/Long (approx 400-800 chars)'}

Output ONLY valid JSON format:
{
  "text": "Complete post content including Title and Body",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "MY_OPENAI_API_KEY") {
      throw new Error("OPENAI_API_KEY is not configured in Secrets.");
    }
    
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
    });

    const content = completion.choices[0].message.content || "";
    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
    res.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error("GPT Generation Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Analysis failed." });
  }
});

export default app;
