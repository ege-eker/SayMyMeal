export interface OptionChoice {
  id: string;
  label: string;
  extraPrice: number;
  optionId: string;
}

export interface FoodOption {
  id: string;
  title: string;
  multiple: boolean;
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
}