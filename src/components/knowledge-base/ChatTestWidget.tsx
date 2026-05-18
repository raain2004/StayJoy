'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface ChatTestWidgetProps {
  propertyId: string
}

export function ChatTestWidget({ propertyId: propId }: ChatTestWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Đây là chatbot test. Hãy hỏi thử để kiểm tra knowledge base đã cập nhật đúng chưa.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolvedPropertyId, setResolvedPropertyId] = useState(propId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Resolve property_id if not provided
  useEffect(() => {
    if (propId) {
      setResolvedPropertyId(propId)
      return
    }
    async function fetchPropertyId() {
      try {
        const res = await fetch('/api/properties/me')
        if (res.ok) {
          const data = await res.json()
          setResolvedPropertyId(data.property_id || data.property?.id || '')
        }
      } catch { /* ignore */ }
    }
    fetchPropertyId()
  }, [propId])

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  async function handleSend() {
    const question = input.trim()
    if (!question || loading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    scrollToBottom()

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: resolvedPropertyId, question }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data = await res.json()

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || '(Không có câu trả lời)',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `❌ Lỗi: ${err instanceof Error ? err.message : 'Không thể kết nối AI'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleClear() {
    setMessages([
      {
        id: 'welcome',
        role: 'system',
        content: 'Đã xóa lịch sử. Hỏi lại để test với dữ liệu mới nhất.',
        timestamp: new Date(),
      },
    ])
  }

  return (
    <div className="flex flex-col h-[500px] rounded-lg border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h3 className="text-sm font-semibold">🤖 Test Chatbot</h3>
          <p className="text-xs text-muted-foreground">
            Kiểm tra chatbot với knowledge base hiện tại
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleClear}>
          Xóa chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : msg.role === 'system'
                  ? 'bg-muted text-muted-foreground italic'
                  : 'bg-muted'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm">
              <span className="animate-pulse">Đang trả lời...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi thử..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            Gửi
          </Button>
        </div>
      </div>
    </div>
  )
}
