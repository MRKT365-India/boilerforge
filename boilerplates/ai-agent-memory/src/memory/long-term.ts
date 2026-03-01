import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Memory {
  id: string;
  content: string;
  embedding?: number[];
  importance: number;
  createdAt: Date;
  lastAccessed: Date;
}

export class LongTermMemory {
  private memories: Memory[] = [];

  async store(content: string, importance = 0.5): Promise<void> {
    const embedding = await this.embed(content);
    this.memories.push({
      id: crypto.randomUUID(),
      content,
      embedding,
      importance,
      createdAt: new Date(),
      lastAccessed: new Date(),
    });
  }

  async search(query: string, topK = 5): Promise<Memory[]> {
    const queryEmbedding = await this.embed(query);
    return this.memories
      .map((m) => ({ ...m, score: this.cosineSimilarity(queryEmbedding, m.embedding!) }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);
  }

  private async embed(text: string): Promise<number[]> {
    const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return res.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dot / (magA * magB);
  }
}
