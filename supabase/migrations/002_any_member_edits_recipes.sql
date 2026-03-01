-- Allow any authenticated family member to edit any recipe
drop policy if exists "Owners update own recipes" on recipes;
create policy "Members update any recipe" on recipes
  for update using (auth.uid() is not null);

-- Also allow any authenticated member to manage recipe ingredients
drop policy if exists "Recipe owners manage ingredients" on recipe_ingredients;
create policy "Members manage any recipe ingredients" on recipe_ingredients
  for all using (auth.uid() is not null);
