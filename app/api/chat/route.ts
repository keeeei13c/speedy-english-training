import { systemPrompt } from '@/config/prompt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// DeepSeek APIレスポンスの型定義
interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    logprobs: null;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details: {
      cached_tokens: number;
    };
    prompt_cache_hit_tokens: number;
    prompt_cache_miss_tokens: number;
  };
  system_fingerprint: string;
}

// チャットレスポンスの型定義
interface ChatResponse {
  is_correct: boolean;
  next_question: string;
  message: string;
}

// 会話履歴を保持する（サーバーの再起動で消える）
// 将来的にはデータベースなどに保存するように変更予定
let conversationHistory: { role: string; content: string }[] = [];
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

export async function POST(request: Request) {
  try {
    // リクエストからメッセージを取得
    const body = await request.json();
    const { message } = body;
    
    console.log('===== REQUEST INFO =====');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`User Message: ${message}`);
    console.log(`Conversation History Length: ${conversationHistory.length} messages`);
    console.log('========================');
    
    if (!message || typeof message !== 'string') {
      console.log('Error: Message is required');
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 会話履歴の初期化
    if (message.toLowerCase() === 'start') {
      conversationHistory = [
        { role: 'system', content: systemPrompt }
      ];
      console.log('Conversation history initialized with system prompt');
    }
    
    // ユーザーメッセージを会話履歴に追加
    conversationHistory.push({ role: 'user', content: message });
    
    // DeepSeek APIリクエストの詳細をログ出力
    console.log('===== DEEPSEEK API REQUEST =====');
    console.log(`Endpoint: ${DEEPSEEK_ENDPOINT}`);
    console.log(`Model: deepseek-chat`);
    console.log(`Temperature: 1.3`);
    console.log(`Messages Count: ${conversationHistory.length}`);
    
    // 会話履歴の最初と最後のメッセージを表示（長い履歴の場合）
    if (conversationHistory.length > 2) {
      console.log('First Message:', {
        role: conversationHistory[0].role,
        content: conversationHistory[0].content.substring(0, 100) + '...' // 長すぎる場合は省略
      });
      console.log('Latest Message:', {
        role: conversationHistory[conversationHistory.length - 1].role,
        content: conversationHistory[conversationHistory.length - 1].content
      });
    } else {
      // 短い履歴の場合は全て表示
      console.log('All Messages:', conversationHistory);
    }
    console.log('===============================');
    
    // DeepSeek APIへのリクエスト
    const apiResponse = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: conversationHistory,
        stream: false,
        temperature: 1.3,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('DeepSeek API Error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get response from DeepSeek API' },
        { status: apiResponse.status }
      );
    }
    
    // APIからのレスポンスを解析
    const deepseekResponse: DeepSeekResponse = await apiResponse.json();
    
    // レスポンス情報をログ出力
    console.log('===== DEEPSEEK API RESPONSE =====');
    console.log(`Response ID: ${deepseekResponse.id}`);
    console.log(`Model: ${deepseekResponse.model}`);
    console.log(`Token Usage: ${deepseekResponse.usage.total_tokens} (${deepseekResponse.usage.prompt_tokens} prompt, ${deepseekResponse.usage.completion_tokens} completion)`);
    
    if (deepseekResponse.choices && deepseekResponse.choices.length > 0) {
      console.log(`Response Role: ${deepseekResponse.choices[0].message.role}`);
      console.log(`Response Content (Preview): ${deepseekResponse.choices[0].message.content.substring(0, 100)}...`);
    }
    console.log('=================================');
    
    // アシスタントの応答を会話履歴に追加
    if (deepseekResponse.choices && deepseekResponse.choices.length > 0) {
      const assistantContent = deepseekResponse.choices[0].message.content;
      conversationHistory.push({
        role: deepseekResponse.choices[0].message.role,
        content: assistantContent
      });
      
      // レスポンスのJSONをパースしてクライアント向けの形式に変換
      try {
        const parsedContent = JSON.parse(assistantContent) as ChatResponse;
        
        console.log('===== PARSED RESPONSE =====');
        console.log(`is_correct: ${parsedContent.is_correct}`);
        console.log(`next_question: ${parsedContent.next_question ? parsedContent.next_question.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`message length: ${parsedContent.message ? parsedContent.message.length : 0} characters`);
        console.log('===========================');
        
        // 正解だった場合は会話履歴をリセット（システムプロンプトのみ残す）
        if (parsedContent.is_correct === true) {
          console.log('🔄 RESETTING CONVERSATION HISTORY - is_correct is true');
          conversationHistory = [
            { role: 'system', content: systemPrompt }
          ];
        }
        
        // フォーマット済みのレスポンスを返す
        return NextResponse.json({
          is_correct: parsedContent.is_correct,
          next_question: parsedContent.next_question || '',
          message: parsedContent.message || ''
        });
      } catch (parseError) {
        console.error('Failed to parse DeepSeek response content:', parseError);
        // パースに失敗した場合はそのままのレスポンスを返す
        return NextResponse.json({
          is_correct: false,
          next_question: '',
          message: 'エラー: AIの応答を解析できませんでした。もう一度試してください。'
        });
      }
    }
    
    // 応答がない場合のエラー処理
    console.log('Error: No valid response from DeepSeek API');
    return NextResponse.json({
      is_correct: false,
      next_question: '',
      message: 'エラー: AIから応答がありませんでした。もう一度試してください。'
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({
      is_correct: false,
      next_question: '',
      message: 'サーバーエラーが発生しました。しばらくしてからもう一度お試しください。'
    }, { status: 500 });
  }
}

// GETリクエストのハンドラ
export async function GET() {
  console.log('GET request received at /api/chat');
  return NextResponse.json({
    message: 'English learning API is ready. Send a POST request to start learning.'
  });
}