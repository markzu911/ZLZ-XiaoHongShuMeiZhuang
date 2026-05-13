/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, Sparkles, Wand2, Trash2, Coins, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [style, setStyle] = useState('輕鬆活潑');
  const [length, setLength] = useState('短文');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('护肤');
  const [efficacy, setEfficacy] = useState<string[]>([]);
  const [sellingPoints, setSellingPoints] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [model, setModel] = useState<'gemini' | 'gpt'>('gemini');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; tags: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SaaS Integration State
  const [userId, setUserId] = useState<string | null>(null);
  const [toolId, setToolId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; integral: number; enterprise: string } | null>(null);

  const categories = ['护肤', '彩妆', '香氛', '洗护', '防晒', '美容仪器'];
  const efficacyList = ['补水保湿', '美白祛斑', '抗皱紧致', '舒缓修护', '控油收敛', '均匀肤色', '持久不脱妆', '哑光雾面'];

  // Filter null/undefined strings as per spec
  const isValidId = (id: any) => id && id !== "null" && id !== "undefined";

  useEffect(() => {
    // Listen for SAAS_INIT message
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SAAS_INIT') {
        const { userId: uId, toolId: tId } = event.data;
        if (isValidId(uId) && isValidId(tId)) {
          setUserId(uId);
          setToolId(tId);
          fetchLaunchData(uId, tId);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Initial fetch if IDs are already in URL (optional but good practice)
    const params = new URLSearchParams(window.location.search);
    const uId = params.get('userId');
    const tId = params.get('toolId');
    if (isValidId(uId) && isValidId(tId)) {
      setUserId(uId);
      setToolId(tId);
      fetchLaunchData(uId!, tId!);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchLaunchData = async (uId: string, tId: string) => {
    try {
      const response = await fetch('/api/tool/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uId, toolId: tId }),
      });
      const data = await response.json();
      if (data.success) {
        setUserInfo(data.data.user);
      }
    } catch (error) {
      console.error('Launch fetch failed:', error);
    }
  };

  const handleEfficacyToggle = (item: string) => {
    setEfficacy(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file as File);
      });
    }
  };

  const analyzeProduct = async () => {
    if (!productName && images.length === 0) {
      alert("请填写产品名称或上传素材图片。");
      return;
    }

    if (!userId || !toolId) {
      // If no SaaS context, allow for demo but warn or prompt?
      // For now, allow it to continue if no userId/toolId is present (demo mode)
    } else {
      // 1. Verify Phase
      try {
        const verifyRes = await fetch('/api/tool/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, toolId }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          alert(verifyData.message || "积分不足，请充值后继续使用。");
          return;
        }
      } catch (err) {
        console.error("Verification failed:", err);
        alert("网络异常，无法校验积分。");
        return;
      }
    }

    setIsLoading(true);
    setResult(null);

    const productInfo = `
产品名称: ${productName}
分类: ${category}
功效关键词: ${efficacy.join(', ')}
核心卖点: ${sellingPoints}
`;

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
- Title: MUST use a viral hook + emotional payoff (e.g., "真的绝了!XX我直接锁死!", "救命！XX好用到我直接哭了！", "家人们谁懂！XX真的太治愈了！").
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
${productInfo}

Overall Guidelines:
1. Tone: Friendly, authentic, "Sisterly" (Muye/Buddy tone). Use lots of emojis.
2. Narrative: Solve a pain point (e.g., dullness, acne, makeup not sticking).
3. Image Content: Mention specific visual cues if images are provided (texture, packaging).
${styleSpecificGuidelines}

Word Count: ${length === '短文' ? 'Short/Concise (approx 150-300 chars)' : 'Detailed/Long (approx 400-800 chars)'}

Output ONLY valid JSON format:
{
  "text": "Complete post content including Title and Body",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    try {
      let finalResult = null;
      if (model === 'gemini') {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            payload: {
              prompt,
              images
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Analysis failed.");
        }
        
        finalResult = await response.json();
      } else {
        // GPT via Backend proxy
        const response = await fetch('/api/generate-gpt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputText: productInfo,
            images,
            style,
            length
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Analysis failed.");
        }
        
        finalResult = await response.json();
      }

      if (finalResult) {
        setResult(finalResult);
        // 3. Consume Phase
        if (userId && toolId) {
          try {
            const consumeRes = await fetch('/api/tool/consume', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, toolId }),
            });
            const consumeData = await consumeRes.json();
            if (consumeData.success) {
              // Update local integral display
              setUserInfo(prev => prev ? { ...prev, integral: consumeData.data.currentIntegral } : null);
            }
          } catch (err) {
            console.error("Consumption recording failed:", err);
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert('已复制到剪贴板');
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      // Fallback for non-secure contexts or certain iFrames
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Ensure the textarea is not visible but part of the document
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          alert('已复制到剪贴板');
        } else {
          alert('复制失败，请尝试手动复制');
        }
      } catch (err) {
        alert('无法访问剪贴板，请手动复制');
      }
      
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">小</span>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400">
            RedNotes 美妆营销助手
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {userInfo && (
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-600">
                <User size={14} className="text-slate-400" />
                <span className="text-xs font-semibold">{userInfo.name}</span>
              </div>
              <div className="w-px h-3 bg-slate-300"></div>
              <div className="flex items-center gap-1.5 text-red-500">
                <Coins size={14} />
                <span className="text-xs font-bold">{userInfo.integral} 积分</span>
              </div>
            </div>
          )}
          {!userInfo && (
            <span className="text-sm text-slate-500">今日已生成: 12/50</span>
          )}
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center">
            <User size={18} className="text-slate-400" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        <section className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">1</span>
            <h2 className="font-semibold text-slate-800">产品卖点与素材</h2>
          </div>
          <div className="p-5 flex-1 space-y-5 overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">产品名称</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="例如：SK-II 神仙水"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">所属分类</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${category === c ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">主打功效 (多选)</label>
              <div className="flex flex-wrap gap-2">
                {efficacyList.map(e => (
                  <button
                    key={e}
                    onClick={() => handleEfficacyToggle(e)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all ${efficacy.includes(e) ? 'bg-red-100 border-red-500 text-red-600 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">核心卖点 / 成分 / 使用感</label>
              <textarea
                value={sellingPoints}
                onChange={(e) => setSellingPoints(e.target.value)}
                className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                placeholder="例如：含有90%以上Pitera，质地清爽如水，能够平衡油脂，让皮肤晶莹剔透。"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">图片素材 (产品图/上脸效果/试色)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-red-500 hover:bg-red-50/20 transition-all"
              >
                <Upload size={20} className="mb-1" />
                <span className="text-[10px]">点击上传产品素材</span>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
                    <img src={img} alt="upload" className="w-full h-full object-cover" />
                    <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><Trash2 size={10}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">2</span>
            <h2 className="font-semibold text-slate-800">笔记风格定制</h2>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <div className="space-y-6 flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">选择AI引擎</label>
                <div className="space-y-2">
                  <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer ${model === 'gemini' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                    <input type="radio" name="model" checked={model === 'gemini'} onChange={() => setModel('gemini')} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border-4 mr-3 ${model === 'gemini' ? 'border-red-500' : 'border-slate-300'}`}></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Gemini 悦享模式</p>
                      <p className="text-[10px] text-slate-500">捕捉妆感细节，文辞优美且富感染力</p>
                    </div>
                  </label>
                  <label className={`flex items-center p-3 border rounded-xl cursor-pointer ${model === 'gpt' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                    <input type="radio" name="model" checked={model === 'gpt'} onChange={() => setModel('gpt')} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border mr-3 ${model === 'gpt' ? 'border-red-500' : 'border-slate-300'}`}></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">GPT 专业测评</p>
                      <p className="text-[10px] text-slate-500">成分深度解析，对比实验，逻辑无懈可击</p>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">文案风格</label>
                <div className="grid grid-cols-2 gap-2">
                  {['輕鬆活潑', '干貨科普', '真實種草', '情緒渲染'].map(s => (
                    <button key={s} onClick={() => setStyle(s)} className={`py-2 px-1 text-[11px] rounded-lg font-medium border ${style === s ? 'bg-red-500 text-white border-red-500' : 'bg-slate-100 border-slate-200'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">发布篇幅</label>
                <div className="grid grid-cols-2 gap-2">
                  {['長文', '短文'].map(l => (
                    <button key={l} onClick={() => setLength(l)} className={`py-2 px-1 text-[11px] rounded-lg font-medium border ${length === l ? 'bg-red-500 text-white border-red-500' : 'bg-slate-100 border-slate-200'}`}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={analyzeProduct}
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black mt-auto disabled:opacity-50"
            >
              {isLoading ? <Sparkles className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5" />}
              <span>{isLoading ? '分析中...' : '开始分析生成'}</span>
            </button>
          </div>
        </section>

        <section className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">3</span>
            <h2 className="font-semibold text-slate-800">预览爆款内容</h2>
          </div>
          <div className="p-5 flex-1 space-y-4 overflow-y-auto bg-slate-50/30">
            {result ? (() => {
              const lines = result.text.split('\n');
              const title = lines[0] || '';
              const BodyText = lines.slice(1).join('\n').trim() || result.text;
              
              return (
                <>
                  <div 
                    onClick={() => copyToClipboard(title)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-red-300 hover:bg-red-50/30 transition-all group relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-red-500 font-bold text-sm">[爆款标题]</h3>
                      <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击复制</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{title}</p>
                  </div>

                  <div 
                    onClick={() => copyToClipboard(BodyText)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-red-300 hover:bg-red-50/30 transition-all group relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-red-500 font-bold text-sm">[笔记正文]</h3>
                      <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击复制</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{BodyText}</p>
                  </div>

                  <div 
                    onClick={() => copyToClipboard(result.tags.map(t => `#${t}`).join(' '))}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:border-red-300 hover:bg-red-50/30 transition-all group relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-red-500 font-bold text-sm">[相关标签]</h3>
                      <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">点击复制</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.tags.map((tag, i) => <span key={i} className="text-blue-500 text-xs font-medium">#{tag}</span>)}
                    </div>
                  </div>
                </>
              );
            })() : <p className="text-slate-400 text-sm text-center pt-10">等待分析生成...</p>}
          </div>
          {result && (
            <div className="p-4 bg-white border-t border-slate-100">
              <button 
                onClick={() => {
                  const fullText = `${result.text}\n\n${result.tags.map(t => `#${t}`).join(' ')}`;
                  copyToClipboard(fullText);
                }}
                className="w-full py-3 text-sm font-bold bg-slate-900 text-white rounded-xl shadow-sm hover:bg-black transition-colors"
              >
                复制全文内容
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="px-6 py-2 border-t border-slate-200 bg-white flex justify-between items-center text-[10px] text-slate-400 font-medium">
        <div className="flex gap-4">
          <span>引擎状态: 运行正常</span>
          <span>延迟: 420ms</span>
        </div>
        <div>© 2024 RedNotes AI. All rights reserved.</div>
      </footer>
    </div>
  );
}
