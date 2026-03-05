import Avatar from '@/components/UI/Avatar';

export default function TypingIndicator() {
    return (
        <div className="message-row message-row-assistant">
            <div className="message-avatar">
                <Avatar size={32} />
            </div>
            <div className="typing-indicator">
                <span className="typing-text">Lucy está escribiendo</span>
                <span className="typing-dots">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                </span>
            </div>
        </div>
    );
}
