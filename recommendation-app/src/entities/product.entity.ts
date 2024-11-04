import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { OrderDetail } from './order-detail.entity';

@Entity('product_sample')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'prod_line_id' })
  prodLineId: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @OneToMany(() => OrderDetail, orderDetail => orderDetail.product, { createForeignKeyConstraints: false })
  orderDetails: OrderDetail[];
}
