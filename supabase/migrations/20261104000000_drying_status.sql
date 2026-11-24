-- A Drying stage between Washing and Done (pending, washing, drying, done, claimed).
-- A new enum value cannot be used in the same migration file that adds it, so it is added here on its own
-- and used in 20261104100000_paper_alignment.sql.
alter type public.order_status add value if not exists 'drying' before 'done';
