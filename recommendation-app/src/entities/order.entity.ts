import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderDetail } from './order-detail.entity';

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'staff_id' })
  staffId: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column()
  status: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @ManyToOne(() => Customer, customer => customer.orders, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => OrderDetail, orderDetail => orderDetail.order, { createForeignKeyConstraints: false })
  orderDetails: OrderDetail[];
}
