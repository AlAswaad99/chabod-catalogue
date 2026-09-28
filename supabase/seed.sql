-- Local-dev-only seed data. Runs on `supabase db reset`.
-- Paired with the [auth.sms.test_otp] entry in config.toml so you can log in
-- as an admin locally without Telegram or a real SMS provider: enter the
-- phone number below and the fixed OTP configured in config.toml.
-- Numbers are +251-shaped to match the login page's Ethiopian-only
-- validation (redesign decisions.md Q2).
insert into public.allowed_users (phone_number, role, display_name)
values ('+251911000001', 'admin', 'Dev Admin')
on conflict (phone_number) do nothing;

-- Fake Telegram link so the dev admin can complete login locally purely via
-- test_otp, without ever touching the real Telegram bot.
insert into public.telegram_links (phone_number, telegram_chat_id, telegram_username)
values ('+251911000001', 0, 'dev_admin')
on conflict (phone_number) do nothing;

-- Second test account with the "member" role, for verifying read-only
-- access is actually enforced (not just hidden in the UI). Paired with its
-- own [auth.sms.test_otp] entry in config.toml.
insert into public.allowed_users (phone_number, role, display_name)
values ('+251922000002', 'member', 'Test Member')
on conflict (phone_number) do nothing;

insert into public.telegram_links (phone_number, telegram_chat_id, telegram_username)
values ('+251922000002', 1, 'dev_member')
on conflict (phone_number) do nothing;

-- Third test account, deliberately left without a telegram_links row, so the
-- login page's needs-link step (redesign plan.md Step 9) has something to
-- exercise locally. No test_otp entry needed since this account never gets
-- that far without first "linking" (insert a telegram_links row for it) by
-- hand in a local psql session.
insert into public.allowed_users (phone_number, role, display_name)
values ('+251933000003', 'member', 'Unlinked Test Member')
on conflict (phone_number) do nothing;
