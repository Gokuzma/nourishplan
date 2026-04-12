export const queryKeys = {
  profile: {
    root: (userId: string | undefined) => ['profile', userId] as const,
  },
  household: {
    root: (userId: string | undefined) => ['household', userId] as const,
    members: (userId: string | undefined, householdId: string | undefined) =>
      ['household', userId, 'members', householdId] as const,
    memberProfiles: (userId: string | undefined, householdId: string | undefined) =>
      ['household', userId, 'member_profiles', householdId] as const,
  },
  recipes: {
    list: (householdId: string | undefined) => ['recipes', householdId] as const,
    detail: (id: string) => ['recipe', id] as const,
    ingredients: (recipeId: string) => ['recipe-ingredients', recipeId] as const,
  },
  meals: {
    list: (householdId: string | undefined) => ['meals', householdId] as const,
    detail: (id: string) => ['meal', id] as const,
  },
  mealPlan: {
    root: (householdId: string | undefined, weekStart: string) =>
      ['meal-plan', householdId, weekStart] as const,
    slots: (planId: string | undefined) => ['meal-plan-slots', planId] as const,
    templates: (householdId: string | undefined) =>
      ['meal-plan-templates', householdId] as const,
  },
  customFoods: {
    list: (householdId: string | undefined) => ['custom-foods', householdId] as const,
  },
  foodSearch: {
    usda: (query: string) => ['food-search', 'usda', query] as const,
    cnf: (query: string) => ['food-search', 'cnf', query] as const,
  },
  nutritionTargets: {
    list: (householdId: string | undefined) => ['nutrition-targets', householdId] as const,
    detail: (householdId: string | undefined, memberId: string | undefined) =>
      ['nutrition-target', householdId, memberId] as const,
  },
  foodLogs: {
    byDate: (householdId: string | undefined, date: string | undefined, memberId?: string | undefined) =>
      ['food-logs', householdId, date, memberId] as const,
    byHouseholdDate: (householdId: string | undefined, date: string | undefined) =>
      ['food-logs', householdId, date] as const,
  },
  foodPrices: {
    list: (householdId: string | undefined) => ['food-prices', householdId] as const,
  },
  weeklySpend: {
    root: (householdId: string | undefined, weekStart: string) =>
      ['weekly-spend', householdId, weekStart] as const,
  },
  spendLogs: {
    byWeek: (householdId: string | undefined, weekStart: string) =>
      ['spend-logs', householdId, weekStart] as const,
  },
  inventory: {
    list: (householdId: string | undefined) =>
      ['inventory', householdId] as const,
    byLocation: (householdId: string | undefined, location: string) =>
      ['inventory', householdId, location] as const,
    expiringSoon: (householdId: string | undefined) =>
      ['inventory', householdId, 'expiring-soon'] as const,
  },
  grocery: {
    list: (householdId: string | undefined, weekStart: string) =>
      ['grocery', householdId, weekStart] as const,
    items: (listId: string | undefined) =>
      ['grocery-items', listId] as const,
  },
  ratings: {
    list: (householdId: string | undefined) => ['ratings', householdId] as const,
    forMember: (householdId: string | undefined, memberId: string | undefined) =>
      ['ratings', householdId, memberId] as const,
  },
  restrictions: {
    forMember: (householdId: string | undefined, memberId: string | undefined) =>
      ['restrictions', householdId, memberId] as const,
  },
  wontEat: {
    forMember: (householdId: string | undefined, memberId: string | undefined) =>
      ['wont-eat', householdId, memberId] as const,
  },
  aiTags: {
    forRecipe: (recipeId: string | undefined) => ['ai-tags', recipeId] as const,
  },
  insights: {
    household: (householdId: string | undefined) => ['insights', householdId] as const,
  },
  planGeneration: {
    job: (jobId: string | null, householdId: string | undefined) =>
      ['plan-generation', householdId, jobId] as const,
    latest: (householdId: string | undefined, weekStart: string) =>
      ['plan-generation', householdId, weekStart, 'latest'] as const,
  },
  cookSession: {
    detail: (sessionId: string | undefined) =>
      ['cook-session', sessionId] as const,
    list: (householdId: string | undefined) =>
      ['cook-session', householdId, 'list'] as const,
    active: (householdId: string | undefined) =>
      ['cook-session', householdId, 'active'] as const,
    latestForMeal: (householdId: string | undefined, mealId: string | undefined) =>
      ['cook-session', householdId, 'meal', mealId, 'latest'] as const,
  },
  batchPrep: {
    summary: (householdId: string | undefined, planId: string | undefined) =>
      ['batch-prep', householdId, planId] as const,
  },
  recipeSteps: {
    detail: (recipeId: string | undefined) =>
      ['recipe-steps', recipeId] as const,
  },
} as const
