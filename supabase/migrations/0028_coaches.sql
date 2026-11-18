-- MIB Acrobatics — the coaches who receive members' "Scrie antrenorului" messages and their push notifications.
-- Idempotent: safe to run more than once. Super Admins flagged shown_as_coach keep full admin rights and appear as „Antrenor”.
update public.users
set shown_as_coach = (lower(email) in ('gigelpruna90@yahoo.com', 'marius.butrin@gmail.com'))
where role in ('admin', 'superadmin');
