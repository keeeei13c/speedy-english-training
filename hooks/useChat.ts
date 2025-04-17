'use client';

import { useState } from 'react';
import { Message, ChatResponse } from '@/lib/types';

// リトライに関する設定
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

// 待機関数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

      console.log('Request body:', JSON.stringify({ message: content }));

      // リトライロジックを実装
      let lastError: Error | null = null;
      let data: ChatResponse | null = null;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`API リクエスト試行 ${attempt}/${MAX_RETRIES}`);
          
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
          
          console.log(`試行 ${attempt} - Response status:`, response.status);
          
          // ヘッダー情報をログに出力
          const headerObj: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headerObj[key] = value;
          });
          console.log(`試行 ${attempt} - Response headers:`, headerObj);

          // レスポンスがJSONでない場合にテキストとして読み取る
          if (!response.headers.get('content-type')?.includes('application/json')) {
            const textResponse = await response.text();
            console.error(`試行 ${attempt} - Non-JSON response:`, textResponse);
            throw new Error('APIからJSONではない応答が返されました');
          }

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'APIエラーが発生しました');
          }

          data = await response.json();
          console.log(`試行 ${attempt} - Response data:`, data);
          
          // 成功したら、リトライループを抜ける
          break;
          
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.error(`試行 ${attempt} - エラー:`, lastError);
          
          // 最後の試行でない場合は待機してリトライ
          if (attempt < MAX_RETRIES) {
            const delayTime = RETRY_DELAY * attempt; // 試行回数に応じて待機時間を増やす
            console.log(`${delayTime}ms 後にリトライします...`);
            await sleep(delayTime);
          }
        }
      }
      
      // すべての試行が失敗した場合
      if (data === null && lastError !== null) {
        throw new Error(`${MAX_RETRIES}回リトライしましたが失敗しました: ${lastError.message}`);
      }
      
      // 以下は変更なし
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${data!.message}${data!.is_correct ? `\n\nNext question: ${data!.next_question}` : ''}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
    } catch (err) {
      console.error('最終エラー:', err);
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