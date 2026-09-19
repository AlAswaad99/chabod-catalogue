-- Local-dev-only seed data. Runs on `supabase db reset`.
-- Paired with the [auth.sms.test_otp] entry in config.toml so you can log in
-- as an admin locally without Telegram or a real SMS provider: enter the
-- phone number below and the fixed OTP configured in config.toml.
insert into public.allowed_users (phone_number, role, display_name)
values ('+15555550123', 'admin', 'Dev Admin')
on conflict (phone_number) do nothing;
