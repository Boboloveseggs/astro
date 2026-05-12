'use strict';

const PROVIDERS = {
  zhipu: {
    name:     '智谱 AI（GLM）',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    auth:     'jwt',
    keyHint:  '格式：xxxxxxxx.xxxxxxxxxxxxxxxx',
    models: [
      { id: 'glm-4-flash',     label: 'GLM-4 Flash（免费，推荐入门）' },
      { id: 'glm-4.5-air',     label: 'GLM-4.5 Air（赠送额度，比赛推荐）' },
      { id: 'glm-4-air',       label: 'GLM-4 Air（性价比高）' },
      { id: 'glm-4-plus',      label: 'GLM-4 Plus（效果最佳）' },
    ],
  },

  deepseek: {
    name:     'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    auth:     'bearer',
    keyHint:  '格式：sk-xxxxxxxxxxxxxxxx',
    models: [
      { id: 'deepseek-chat',     label: 'DeepSeek V3（推荐）' },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1（推理增强）' },
    ],
  },

  gemini: {
    name:     'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
    auth:     'gemini',
    keyHint:  'Google AI Studio API Key（aistudio.google.com）',
    models: [
      { id: 'gemini-2.0-flash',                 label: 'Gemini 2.0 Flash（推荐）' },
      { id: 'gemini-2.0-flash-thinking-exp',    label: 'Gemini 2.0 Flash Thinking（推理）' },
      { id: 'gemini-1.5-pro',                   label: 'Gemini 1.5 Pro（高质量）' },
      { id: 'gemini-1.5-flash',                 label: 'Gemini 1.5 Flash（快速）' },
    ],
  },

  openai: {
    name:     'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    auth:     'bearer',
    keyHint:  '格式：sk-xxxxxxxxxxxxxxxx',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini（经济）' },
      { id: 'gpt-4o',      label: 'GPT-4o（推荐）' },
      { id: 'o1-mini',     label: 'o1 Mini（推理）' },
    ],
  },

  anthropic: {
    name:     'Anthropic（Claude）',
    endpoint: 'https://api.anthropic.com/v1/messages',
    auth:     'anthropic',
    keyHint:  '格式：sk-ant-xxxxxxxxxxxxxxxx',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku（快速）' },
      { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet（推荐）' },
    ],
  },

  xai: {
    name:     'xAI（Grok）',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    auth:     'bearer',
    keyHint:  '格式：xai-xxxxxxxxxxxxxxxx',
    models: [
      { id: 'grok-2-latest',      label: 'Grok 2（推荐）' },
      { id: 'grok-2-mini-latest', label: 'Grok 2 Mini（快速）' },
    ],
  },

  groq: {
    name:     'Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    auth:     'bearer',
    keyHint:  '格式：gsk_xxxxxxxxxxxxxxxx（console.groq.com）',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B（推荐）' },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B（极速免费）' },
      { id: 'gemma2-9b-it',            label: 'Gemma2 9B' },
    ],
  },

  moonshot: {
    name:     'Moonshot（Kimi）',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    auth:     'bearer',
    keyHint:  '格式：sk-xxxxxxxxxxxxxxxx',
    models: [
      { id: 'moonshot-v1-8k',   label: 'Moonshot 8K' },
      { id: 'moonshot-v1-32k',  label: 'Moonshot 32K' },
      { id: 'moonshot-v1-128k', label: 'Moonshot 128K' },
    ],
  },

  qwen: {
    name:     '通义千问（Qwen）',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    auth:     'bearer',
    keyHint:  '格式：sk-xxxxxxxxxxxxxxxx',
    models: [
      { id: 'qwen-turbo', label: 'Qwen Turbo（快速）' },
      { id: 'qwen-plus',  label: 'Qwen Plus' },
      { id: 'qwen-max',   label: 'Qwen Max（最强）' },
      { id: 'qwq-32b',    label: 'QwQ 32B（推理）' },
    ],
  },

  doubao: {
    name:     '豆包（字节跳动）',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    auth:     'bearer',
    keyHint:  '火山方舟 API Key（console.volcengine.com/ark）',
    models: [
      { id: 'doubao-1-5-pro-32k',  label: 'Doubao 1.5 Pro 32K（推荐）' },
      { id: 'doubao-1-5-lite-32k', label: 'Doubao 1.5 Lite 32K（经济）' },
      { id: 'doubao-pro-32k',      label: 'Doubao Pro 32K' },
    ],
  },

  yi: {
    name:     '零一万物（Yi）',
    endpoint: 'https://api.lingyiwanwu.com/v1/chat/completions',
    auth:     'bearer',
    keyHint:  '零一万物 API Key（platform.lingyiwanwu.com）',
    models: [
      { id: 'yi-large',  label: 'Yi Large（推荐）' },
      { id: 'yi-medium', label: 'Yi Medium' },
      { id: 'yi-spark',  label: 'Yi Spark（快速）' },
    ],
  },

  minimax: {
    name:     'Minimax',
    endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    auth:     'bearer',
    keyHint:  'Minimax API Key（platform.minimaxi.com）',
    models: [
      { id: 'abab6.5s-chat', label: 'ABAB 6.5S（推荐）' },
      { id: 'abab5.5-chat',  label: 'ABAB 5.5' },
    ],
  },

  mistral: {
    name:     'Mistral AI',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    auth:     'bearer',
    keyHint:  'Mistral API Key（console.mistral.ai）',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large（最强）' },
      { id: 'mistral-small-latest', label: 'Mistral Small（经济）' },
    ],
  },
};
