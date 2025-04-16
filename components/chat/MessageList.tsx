'use client';

import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-2 p-4 rounded-lg',
            message.role === 'assistant'
              ? 'bg-secondary'
              : 'bg-primary text-primary-foreground'
          )}
        >
          <Avatar className="h-8 w-8">
            {message.role === 'assistant' ? (
              <Bot className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
          </Avatar>
          <div className="flex-1">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}