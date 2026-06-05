export interface OptionChoice {
  id: string;
  label: string;
  extraPrice: number;
  isAvailable: boolean;
  isStandard: boolean;
  optionId: string;
}

export interface FoodOption {
  id: string;
  title: string;
  multiple: boolean;
  isAvailable: boolean;
  foodId: string;
  choices: OptionChoice[];
}

export interface CreateOptionInput {
  foodId: string;
  title: string;
  multiple?: boolean;
}

export interface AddChoiceInput {
  optionId: string;
  label: string;
  extraPrice?: number;
  isStandard?: boolean;
}

export interface UpdateOptionInput {
  isAvailable?: boolean;
}

export interface UpdateChoiceInput {
  isAvailable?: boolean;
  isStandard?: boolean;
}
