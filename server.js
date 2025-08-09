import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

const users = {
  'token-basic': { name: '初级会员', maxDaily: 5, modelSelectable: false, callsToday: 0, lastCallDate: null },
  'token-mid': { name: '中级会员', maxDaily: 10, modelSelectable: true, callsToday: 0, lastCallDate: null },
  'token-enterprise': { name: '企业版', maxDaily: Infinity, modelSelectable: true, callsToday: 0, lastCallDate: null },
};

function resetCallsIfNeeded(user) {
  const today = new Date().toDateString();
  if (user.lastCallDate !== today) {
    user.callsToday = 0;
    user.lastCallDate = today;
  }
}

app.use('/api/generate-script', (req, res, next) => {
  const token = (req.headers['x-api-token'] || '').toString();
  if (!token || !users[token]) {
    return res.status(401).json({ error: '无效Token或未登录会员' });
  }
  resetCallsIfNeeded(users[token]);
  if (users[token].callsToday >= users[token].maxDaily) {
    return res.status(429).json({ error: '当天调用次数已用完，请明天再来~' });
  }
  req.user = users[token];
  next();
});

app.post('/api/generate-script', async (req, res) => {
  const { query, tone, length, model } = req.body;
  if (!query || !tone || !length) {
    return res.status(400).json({ error: '缺少参数' });
  }

  let useModel = 'gpt-4';
  if (req.user.modelSelectable && model) {
    const allowed = ['gpt-4', 'gpt-3.5-turbo'];
    if (allowed.includes(model)) useModel = model;
  }

  try {
    const prompt = `
请帮我写一个${length}秒的短视频脚本，主题是“${query}”，语气是${tone}。
请分开写“开头（0-3秒）”、“中段（3-${Math.floor(length / 2)}秒）”、“结尾（${Math.floor(length / 2)}-${length}秒）”的旁白和镜头描述，并给出配乐建议与标签。
`;

    const completion = await openai.createChatCompletion({
      model: useModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.8,
    });

    req.user.callsToday++;

    res.json({
      script: completion.data.choices[0].message.content,
      user: req.user.name,
      callsToday: req.user.callsToday,
      maxDaily: req.user.maxDaily === Infinity ? '∞' : req.user.maxDaily,
    });
  } catch (error) {
    console.error('OpenAI error:', error.response?.data || error.message);
    res.status(500).json({ error: 'AI生成失败，请稍后重试' });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ ok: true, name: 'Weiran AI Backend' });
});

app.listen(PORT, () => {
  console.log(`Weiran AI 后端运行在 http://localhost:${PORT}`);
});
