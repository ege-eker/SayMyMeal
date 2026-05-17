export interface CreateAddressInput {
  label: string;
  houseNumber: string;
  street: string;
  city: string;
  postcode: string;
  notes?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  isDefault?: boolean;
}
