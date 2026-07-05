import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatMessage, KimiClientResponse } from './kimi-client.types';

@Injectable()
export class KimiClientService {
  private readonly logger = new Logger(KimiClientService.name);
  private client: OpenAI | null = null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.model =
      this.configService.get<string>('KIMI_MODEL') ?? 'kimi-k2-0711-preview';
  }

  async chat(messages: ChatMessage[]): Promise<KimiClientResponse> {
    const completion = await this.getClient().chat.completions.create({
      model: this.model,
      messages,
    });

    const content = completion.choices[0]?.message?.content ?? '';

    return { content };
  }

  private getClient(): OpenAI {
    if (this.client) {
      return this.client;
    }

    const baseURL = this.configService.get<string>('KIMI_BASE_URL');
    const apiKey = this.configService.get<string>('KIMI_API_KEY');

    if (!baseURL || !apiKey) {
      this.logger.error(
        'KIMI_BASE_URL or KIMI_API_KEY is not configured. Please set them in server/.env',
      );
      throw new Error('Kimi API credentials are not configured');
    }

    this.client = new OpenAI({
      baseURL,
      apiKey,
      timeout: 30000,
      maxRetries: 1,
    });

    return this.client;
  }
}
