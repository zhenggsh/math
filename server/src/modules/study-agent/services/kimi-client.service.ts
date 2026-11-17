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
      this.configService.get<string>('KIMI_MODEL') ?? 'kimi-k2.6';
  }

  async chat(messages: ChatMessage[]): Promise<KimiClientResponse> {
    const completion = await this.getClient().chat.completions.create({
      model: this.model,
      messages,
      // Kimi K2 默认开启思考，一次回答经常超过 30 秒。侧边栏问答关闭思考以在超时内返回。
      thinking: { type: 'disabled' },
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

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
      timeout: 60000,
      maxRetries: 0,
    });

    return this.client;
  }
}
