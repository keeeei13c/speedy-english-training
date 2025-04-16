'use client';

import { useState } from 'react';
import { Message, ChatResponse } from '@/lib/types';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to API - 正しいパスに修正
      console.log('Sending request to:', '/api/chat');
      console.log('Request body:', JSON.stringify({ message: content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // キャッシュを無効化
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        // キャッシュを無効化
        cache: 'no-store',
        body: JSON.stringify({ message: content }),
      });

      console.log('Response status:', response.status);
      
      // レスポンスのヘッダー情報をログに出力
      const headers = Object.fromEntries([...response.headers.entries()]);
      console.log('Response headers:', headers);

      // レスポンスがJSONでない場合にテキストとして読み取る
      if (!response.headers.get('content-type')?.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        throw new Error('APIからJSONではない応答が返されました');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'APIエラーが発生しました');
      }

      const data: ChatResponse = await response.json();
      console.log('Response data:', data);

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${data.message}${data.is_correct ? `\n\nNext question: ${data.next_question}` : ''}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 学習を開始する関数
  const startLearning = async () => {
    await sendMessage('Start');
  };

  // チャット履歴をクリアする関数
  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    startLearning,
    clearMessages,
  };
}