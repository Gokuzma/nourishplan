import { describe, it, expect } from 'vitest'
import { queryKeys } from './queryKeys'

describe('queryKeys - feedback engine keys', () => {
  it('queryKeys.ratings.list returns ["ratings", householdId]', () => {
    expect(queryKeys.ratings.list('hid')).toEqual(['ratings', 'hid'])
  })

  it('queryKeys.restrictions.forMember returns ["restrictions", householdId, memberId]', () => {
    expect(queryKeys.restrictions.forMember('hid', 'mid')).toEqual(['restrictions', 'hid', 'mid'])
  })

  it('queryKeys.wontEat.forMember returns ["wont-eat", householdId, memberId]', () => {
    expect(queryKeys.wontEat.forMember('hid', 'mid')).toEqual(['wont-eat', 'hid', 'mid'])
  })

  it('queryKeys.aiTags.forRecipe returns ["ai-tags", recipeId]', () => {
    expect(queryKeys.aiTags.forRecipe('rid')).toEqual(['ai-tags', 'rid'])
  })

  it('queryKeys.insights.household returns ["insights", householdId]', () => {
    expect(queryKeys.insights.household('hid')).toEqual(['insights', 'hid'])
  })
})
