/*
# Add registration fee tracking to profiles

## Overview
Adds a `registration_paid` boolean and `registration_fee_paid_at` timestamp
to the `profiles` table so we can gate homestay browsing behind a one-time
student registration fee.

## Changes
### profiles (modified)
- `registration_paid` boolean, default false — whether the student has paid
  the one-time registration fee. Hosts are always considered paid (they don't
  pay a registration fee).
- `registration_fee_paid_at` timestamptz, nullable — when the fee was paid.

## Security
No RLS policy changes needed — existing profile policies already allow each
authenticated user to read all profiles and update their own. The new columns
inherit those policies automatically.

## Important notes
1. Existing profiles get `registration_paid = false` by default, meaning
   existing students will see the registration paywall until they pay.
2. Hosts are not affected — the frontend checks `user_type === 'host'` to
   bypass the registration gate.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'registration_paid'
  ) THEN
    ALTER TABLE profiles ADD COLUMN registration_paid boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'registration_fee_paid_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN registration_fee_paid_at timestamptz;
  END IF;
END $$;
