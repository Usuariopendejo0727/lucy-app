import { Conversation } from '@/types';

const STORAGE_KEY = 'lucy-conversations';
const MAX_CONVERSATIONS = 50;

export function getConversations(): Conversation[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const conversations: Conversation[] = JSON.parse(data);
        return conversations.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    } catch {
        return [];
    }
}

// Bug #6 fix: Save entire conversations array at once (used with debounce from useConversations)
export function saveConversations(conversations: Conversation[]): void {
    if (typeof window === 'undefined') return;
    try {
        // Prune oldest if exceeding max
        const pruned = conversations.slice(0, MAX_CONVERSATIONS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch (e) {
        console.error('Error saving conversations:', e);
    }
}


export function deleteConversation(id: string): void {
    if (typeof window === 'undefined') return;
    try {
        const conversations = getConversations().filter((c) => c.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
        console.error('Error deleting conversation:', e);
    }
}

export function groupConversationsByDate(conversations: Conversation[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const last7Days = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; conversations: Conversation[] }[] = [
        { label: 'Hoy', conversations: [] },
        { label: 'Ayer', conversations: [] },
        { label: 'Últimos 7 días', conversations: [] },
        { label: 'Anteriores', conversations: [] },
    ];

    for (const conv of conversations) {
        const date = new Date(conv.updatedAt);
        if (date >= today) {
            groups[0].conversations.push(conv);
        } else if (date >= yesterday) {
            groups[1].conversations.push(conv);
        } else if (date >= last7Days) {
            groups[2].conversations.push(conv);
        } else {
            groups[3].conversations.push(conv);
        }
    }

    return groups.filter((g) => g.conversations.length > 0);
}
