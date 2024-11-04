import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_detail')
export class OrderDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'prod_sample_id' })
  productId: number;

  @Column()
  quantity: number;

  @Column({ name: 'current_price', type: 'decimal', precision: 10, scale: 2 })
  currentPrice: number;

  @ManyToOne(() => Order, order => order.orderDetails, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, product => product.orderDetails, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'prod_sample_id' })
  product: Product;
}
