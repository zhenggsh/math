import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatMessage, KimiClientResponse } from './kimi-client.types';

@Injectable()
export class KimiClientService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      baseURL: this.configService.get<string>('KIMI_BASE_URL'),
      apiKey: this.configService.get<string>('KIMI_API_KEY'),
      timeout: 30000,
      maxRetries: 1,
    });
    this.model = this.configService.get<string>('KIMI_MODEL') ?? 'kimi-k2-0711-preview';
  }

  async chat(messages: ChatMessage[]): Promise<KimiClientResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });

    const content = completion.choices[0]?.message?.content ?? '';

    return { content };
  }
}
