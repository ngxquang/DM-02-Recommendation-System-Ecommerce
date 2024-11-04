import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderDetail } from '../entities/order-detail.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderDetail)
    private orderDetailRepository: Repository<OrderDetail>,
  ) {}

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['customer', 'orderDetails', 'orderDetails.product'],
    });
  }

  async findOne(id: number): Promise<Order> {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'orderDetails', 'orderDetails.product'],
    });
  }

  async createOrder(data: {
    customerId: number;
    orderDetails: { productId: number; quantity: number }[];
  }): Promise<Order> {
    // Start transaction
    const queryRunner = this.orderRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create order
      const order = queryRunner.manager.create(Order, {
        customerId: data.customerId,
      });
      const savedOrder = await queryRunner.manager.save(order);

      // Create order details
      const orderDetails = data.orderDetails.map((detail) =>
        queryRunner.manager.create(OrderDetail, {
          orderId: savedOrder.id,
          productId: detail.productId,
          quantity: detail.quantity,
        }),
      );
      await queryRunner.manager.save(OrderDetail, orderDetails);

      // Commit transaction
      await queryRunner.commitTransaction();

      return this.findOne(savedOrder.id);
    } catch (err) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async findByCustomerId(customerId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customerId },
      relations: ['orderDetails', 'orderDetails.product'],
    });
  }
}