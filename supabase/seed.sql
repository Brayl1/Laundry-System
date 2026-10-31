-- Demo data. Login: cashier1 / pass123 (the username maps to cashier1@laundry.local)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'cashier1@laundry.local',
  extensions.crypt('pass123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"cashier1","display_name":"LenLen","role":"admin"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"cashier1@laundry.local","email_verified":true}',
  'email', now(), now(), now()
);

insert into public.settings (id) values (1);

insert into public.addons (name, price, sort) values
  ('Fabric Softener', 20, 1),
  ('Fold & Pack',     30, 2),
  ('Express Wash',    50, 3);

insert into public.machines (label) values
  ('Washer 1'), ('Washer 2'), ('Washer 3'), ('Washer 4');

-- A plain cashier, so the cashier (non-admin) side can be tried. Login: cashier2 / pass123
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'cashier2@laundry.local',
  extensions.crypt('pass123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"cashier2","display_name":"Maria","role":"cashier"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"cashier2@laundry.local","email_verified":true}',
  'email', now(), now(), now()
);
