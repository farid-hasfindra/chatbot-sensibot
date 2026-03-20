export const API_BASE_URL = '/api/v1';

export interface ChatResponse {
  response: string;
  rag_enabled: boolean;
  sources: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost: number;
  };
}

export const api = {
  chat: async (
    message: string,
    useRag: boolean,
    conversationId: string | null = null,
    model: string | null = null
  ): Promise<ChatResponse> => {
    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        use_rag: useRag,
        conversation_id: conversationId,
        ...(model && { model }),
      }),
    });
    
    if (!res.ok) {
      throw new Error('Failed to send message');
    }
    
    return res.json();
  },

  uploadDocument: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Failed to upload document');
    }

    return res.json();
  },

  resetDatabase: async (): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE_URL}/documents/reset`, {
      method: 'POST',
    });

    if (!res.ok) {
      throw new Error('Failed to reset database');
    }

    return res.json();
  }
};
