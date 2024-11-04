export class CreateOrderDetailDto {
    productId: number;
    quantity: number;
  }
  
  export class CreateOrderDto {
    customerId: number;
    orderDetails: CreateOrderDetailDto[];
  }