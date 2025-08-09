import React, { useState } from 'react';
import translations from './i18n';

export default function App() {
  const [lang, setLang] = useState('zh');
  const t = translations[lang];

  const [apiToken, setApiToken] = useState('token-basic');
  const [query, setQuery] = useState('');
  const [tone, setTone] = useState(t.selectTone[0]);
  const [length, setLength] = useState(30);
  const [model, setModel] = useState('gpt-4');
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState('');
  const [error, setError] = useState(null);
  const [userPlan, setUserPlan] = useState('初级会员');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  async function handleGenerate(e) {
    e.preventDefault();
    if (!query.trim()) {
      alert(lang === 'zh' ? '请输入关键词！' : 'Please enter a keyword');
      return;
    }
    setLoading(true);
    setScript('');
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': '
