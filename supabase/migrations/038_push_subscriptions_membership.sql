-- Security fix (review finding): the 037 insert/update policies only checked
-- user_id = auth.uid(), so any authenticated user could register a push
-- subscription against ANOTHER household's id and receive its notifications
-- (leftover names, plan timing). Require household membership too, via the
-- established security-definer helper (002).

drop policy "Users can add their own push subscriptions" on push_subscriptions;
create policy "Users can add their own push subscriptions"
  on push_subscriptions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and household_id = public.get_user_household_id()
  );

drop policy "Users can update their own push subscriptions" on push_subscriptions;
create policy "Users can update their own push subscriptions"
  on push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and household_id = public.get_user_household_id()
  );
