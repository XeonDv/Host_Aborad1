/*
# Add admin role to profiles

## Overview
Extends the `user_type` CHECK constraint on profiles to include 'admin',
and creates SECURITY DEFINER functions that allow admin users to read
all profiles, listings, and bookings — even rows they don't own.

## Changes
### profiles (modified)
- `user_type` CHECK constraint updated to allow 'admin' in addition to
  'student' and 'host'

### New functions
- `is_admin()` — returns true if the current user's profile has
  user_type = 'admin'. Used by other admin functions.
- `admin_read_profiles()` — SECURITY DEFINER function returning all
  profiles. Raises exception if caller is not admin.
- `admin_read_listings()` — SECURITY DEFINER function returning all
  listings with host name and host email. Raises exception if not admin.
- `admin_read_bookings()` — SECURITY DEFINER function returning all
  bookings with listing + student info. Raises exception if not admin.

## Security
- `is_admin()` checks `auth.uid()` against the profiles table — cannot
  be spoofed by client-side claims.
- SECURITY DEFINER functions call `is_admin()` and raise an exception
  if the caller is not an admin, so non-admin users get nothing.
- No new RLS policies — admin reads bypass RLS through SECURITY DEFINER.

## Important notes
1. To make a user an admin, run:
   UPDATE profiles SET user_type = 'admin' WHERE id = '<user-id>';
2. The frontend checks profile.user_type === 'admin' to show the admin
   panel link and gate the /admin route.
3. Existing policies that check user_type = 'student' or 'host' still
   work — admin is a separate role that primarily reads through the
   SECURITY DEFINER functions.
*/

-- Drop the old CHECK constraint and add one that includes 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('student', 'host', 'admin'));

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
$$;

-- Admin: read all profiles
CREATE OR REPLACE FUNCTION admin_read_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
END;
$$;

-- Admin: read all listings with host info
CREATE OR REPLACE FUNCTION admin_read_listings()
RETURNS TABLE (
  id uuid,
  host_id uuid,
  title text,
  description text,
  city text,
  neighbourhood text,
  price_per_month numeric,
  room_type text,
  meals_included boolean,
  amenities text[],
  photo_urls text[],
  available_from date,
  available_to date,
  max_stay_months integer,
  created_at timestamptz,
  host_name text,
  host_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT
      l.id, l.host_id, l.title, l.description, l.city, l.neighbourhood,
      l.price_per_month, l.room_type::text, l.meals_included, l.amenities,
      l.photo_urls, l.available_from, l.available_to, l.max_stay_months,
      l.created_at,
      p.full_name AS host_name,
      au.email AS host_email
    FROM listings l
    LEFT JOIN profiles p ON p.id = l.host_id
    LEFT JOIN auth.users au ON au.id = l.host_id
    ORDER BY l.created_at DESC;
END;
$$;

-- Admin: read all bookings with listing + student info
CREATE OR REPLACE FUNCTION admin_read_bookings()
RETURNS TABLE (
  id uuid,
  student_id uuid,
  listing_id uuid,
  check_in date,
  check_out date,
  months integer,
  total_amount numeric,
  status text,
  stripe_session_id text,
  created_at timestamptz,
  listing_title text,
  listing_city text,
  student_name text,
  student_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT
      b.id, b.student_id, b.listing_id, b.check_in, b.check_out,
      b.months, b.total_amount, b.status::text, b.stripe_session_id,
      b.created_at,
      l.title AS listing_title,
      l.city AS listing_city,
      p.full_name AS student_name,
      au.email AS student_email
    FROM bookings b
    LEFT JOIN listings l ON l.id = b.listing_id
    LEFT JOIN profiles p ON p.id = b.student_id
    LEFT JOIN auth.users au ON au.id = b.student_id
    ORDER BY b.created_at DESC;
END;
$$;
