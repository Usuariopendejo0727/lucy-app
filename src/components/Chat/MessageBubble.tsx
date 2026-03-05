import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types';
import Avatar from '@/components/UI/Avatar';

interface MessageBubbleProps {
    message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div className={`message-row ${isUser ? 'message-row-user' : 'message-row-assistant'}`}>
            {!isUser && (
                <div className="message-avatar">
                    <Avatar size={32} />
                </div>
            )}
            <div className={`message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`}>
                {isUser ? (
                    <p className="message-text-user">{message.content}</p>
                ) : (
                    <div className="message-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
