import { Controller, Get, Param, Query } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get(':customerId')
  async getRecommendations(
    @Param('customerId') customerId: number,
  ) {
    return this.recommendationService.getRecommendations(customerId);
  }

  @Get()
  async getRecHello() {
    return "hello from recommendation"
  }
}