import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RecommendationService {
  private readonly recommendationServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.recommendationServiceUrl = this.configService.get<string>('RECOMMENDATION_SERVICE_URL');
  }

  async getRecommendations(customerId: number) {
    try {
      console.log("URL::: ", `${this.recommendationServiceUrl}/recommendations/${customerId}`);

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.recommendationServiceUrl}/recommendations/${customerId}`,
        )
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }
}