import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getAdminUser(supabase: ReturnType<typeof createClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: userProperty } = await supabase
    .from('users_properties')
    .select('role')
    .eq('user_id', session.user.id)
    .limit(1)
    .single()

  if (!userProperty || userProperty.role !== 'admin') return null
  return session.user
}

// Provider-specific call functions (inline, no DB save)
async function testGemini(apiKey: string, model: string, question: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: question }] }],
      systemInstruction: { parts: [{ text: 'Bạn là trợ lý AI cho homestay. Trả lời ngắn gọn.' }] },
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini ${response.status}: ${text.slice(0, 200)}`)
  }
  const data = await response.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function testOpenAI(apiKey: string, model: string, question: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Bạn là trợ lý AI cho homestay. Trả lời ngắn gọn.' },
        { role: 'user', content: question },
      ],
      max_tokens: 256,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 200)}`)
  }
  const data = await response.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

async function testAnthropic(apiKey: string, model: string, question: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      system: 'Bạn là trợ lý AI cho homestay. Trả lời ngắn gọn.',
      messages: [{ role: 'user', content: question }],
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Anthropic ${response.status}: ${text.slice(0, 200)}`)
  }
  const data = await response.json()
  return data?.content?.[0]?.text ?? ''
}

async function testGroq(apiKey: string, model: string, question: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Bạn là trợ lý AI cho homestay. Trả lời ngắn gọn.' },
        { role: 'user', content: question },
      ],
      max_tokens: 256,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Groq ${response.status}: ${text.slice(0, 200)}`)
  }
  const data = await response.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

// POST /api/admin/llm-settings/test — test LLM connection without saving
export async function POST(request: NextRequest) {
  const supabase = createClient()

  const user = await getAdminUser(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { provider?: string; model?: string; api_key?: string; question?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { provider, model, api_key, question } = body

  if (!provider || !model || !api_key || !question) {
    return NextResponse.json(
      { error: 'provider, model, api_key, and question are required' },
      { status: 400 }
    )
  }

  const validProviders = ['gemini', 'openai', 'anthropic', 'groq']
  if (!validProviders.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const start = Date.now()

  try {
    let answer: string

    switch (provider) {
      case 'gemini':
        answer = await testGemini(api_key, model, question)
        break
      case 'openai':
        answer = await testOpenAI(api_key, model, question)
        break
      case 'anthropic':
        answer = await testAnthropic(api_key, model, question)
        break
      case 'groq':
        answer = await testGroq(api_key, model, question)
        break
      default:
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const latency_ms = Date.now() - start

    return NextResponse.json({
      success: true,
      answer: answer.slice(0, 500),
      latency_ms,
    })
  } catch (error) {
    const latency_ms = Date.now() - start
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[POST /api/admin/llm-settings/test]', msg)

    return NextResponse.json({
      success: false,
      error: msg,
      latency_ms,
    })
  }
}
