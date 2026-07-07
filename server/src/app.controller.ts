import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'projecthub-server',
      timestamp: new Date().toISOString(),
    };
  }
}