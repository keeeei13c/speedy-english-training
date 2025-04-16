'use client';
import { useChat } from '@/hooks/useChat';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';
import { Button } from '@/components/ui/button'; 
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">English Learning Chat</h1>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={clearMessages}
            disabled={messages.length === 0 || isLoading}
          >
            Reset Chat
          </Button>
        </div>
      </header>

      <div className="flex flex-col min-h-[80vh] justify-between border rounded-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              Start your English learning journey by typing a message below!
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
        </div>
        
        {error && (
          <div className="p-2 bg-red-50 text-red-500 text-center text-sm">
            {error}
          </div>
        )}
        
        <div className="sticky bottom-0 bg-background p-4 border-t">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}