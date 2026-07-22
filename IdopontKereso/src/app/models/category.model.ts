export interface CategoryColor {
  primary: string;
  secondary?: string; 
}

export interface Category {
  _id?: string;
  categoryId: string;
  color: CategoryColor;
  userId?: string; 
  createdAt?: Date;
  updatedAt?: Date;
}