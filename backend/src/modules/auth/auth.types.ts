export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: 'CUSTOMER' | 'OWNER';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateAllergenProfileInput {
  allergens: string[];
  dietaryPreferences: string[];
}
