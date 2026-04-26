import type { Recipe, RecipeDetail } from './types';

interface NavStore {
  recipe: Recipe | null;
  fridgeIngredientNames: string[];
  recipeDetail: RecipeDetail | null;
}

const store: NavStore = {
  recipe: null,
  fridgeIngredientNames: [],
  recipeDetail: null,
};

export function setNavStore(data: Partial<NavStore>): void {
  Object.assign(store, data);
}

export function getNavStore(): NavStore {
  return store;
}
