import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }

  @Get('customer/:customerId')
  findByCustomerId(@Param('customerId') customerId: string) {
    return this.orderService.findByCustomerId(+customerId);
  }

  @Post()
  create(@Body() createOrderDto: {
    customerId: number;
    orderDetails: { productId: number; quantity: number }[];
  }) {
    return this.orderService.createOrder(createOrderDto);
  }
}