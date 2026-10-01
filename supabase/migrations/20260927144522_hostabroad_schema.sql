/*
# HostAbroad.ca — core schema

## Overview
Creates the tables that power a homestay accommodation platform connecting
international students with host families across Canada. Includes user profiles
(with a role of student or host), host-published room listings, and student
booking requests.

## Tables

### profiles
- `id` uuid, primary key, matches auth.users id (1:1 with each account)
- `user_type` text — either 'student' or 'host'
- `full_name` text — display name
- `phone` text — contact phone
- `country` text — home country (students) or country of residence (hosts)
- `city` text — preferred destination city (students) or hosting city (hosts)
- `bio` text — short about text
- `avatar_url` text — optional profile photo URL
- `created_at` timestamptz

### listings
- `id` uuid, primary key
- `host_id` uuid, foreign key → profiles(id), defaults to auth.uid()
- `title` text — listing headline
- `description` text — detailed description
- `city` text — Canadian city where the room is located
- `neighbourhood` text — area within the city
- `price_per_month` numeric(10,2) — monthly rate in CAD
- `room_type` text — 'Private room' | 'Shared room' | 'Studio'
- `meals_included` boolean — whether meals are provided
- `amenities` text[] — e.g. {Wi-Fi, Laundry, Desk, Air conditioning}
- `photo_urls` text[] — listing photo URLs
- `available_from` date — earliest check-in
- `available_to` date — latest check-out
- `max_stay_months` int — maximum length of stay
- `created_at` timestamptz

### bookings
- `id` uuid, primary key
- `student_id` uuid, foreign key → profiles(id), defaults to auth.uid()
- `listing_id` uuid, foreign key → listings(id)
- `check_in` date
- `check_out` date
- `months` int — number of months booked
- `total_amount` numeric(10,2) — total in CAD
- `status` text — 'pending' | 'confirmed' | 'cancelled' | 'completed'
- `stripe_session_id` text — Stripe Checkout session id (filled after payment setup)
- `created_at` timestamptz

## Security (RLS)
- profiles: each authenticated user can read all profiles (so students can see
  host info and hosts can see student info), but only update/insert their own.
- listings: anyone authenticated can read; only the owning host can insert,
  update, and delete their own listings.
- bookings: a student can read/update/delete their own bookings; a host can
  read bookings on their own listings (so they can confirm requests).
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('student', 'host')),
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  country text DEFAULT '',
  city text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  neighbourhood text DEFAULT '',
  price_per_month numeric(10,2) NOT NULL DEFAULT 0,
  room_type text NOT NULL DEFAULT 'Private room' CHECK (room_type IN ('Private room', 'Shared room', 'Studio')),
  meals_included boolean NOT NULL DEFAULT false,
  amenities text[] NOT NULL DEFAULT '{}',
  photo_urls text[] NOT NULL DEFAULT '{}',
  available_from date,
  available_to date,
  max_stay_months int DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listings_select_all_authenticated" ON listings;
CREATE POLICY "listings_select_all_authenticated"
  ON listings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "listings_insert_own" ON listings;
CREATE POLICY "listings_insert_own"
  ON listings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "listings_update_own" ON listings;
CREATE POLICY "listings_update_own"
  ON listings FOR UPDATE TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "listings_delete_own" ON listings;
CREATE POLICY "listings_delete_own"
  ON listings FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  check_in date NOT NULL,
  check_out date NOT NULL,
  months int NOT NULL DEFAULT 1,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  stripe_session_id text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own_or_host" ON bookings;
CREATE POLICY "bookings_select_own_or_host"
  ON bookings FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = bookings.listing_id
      AND listings.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;
CREATE POLICY "bookings_insert_own"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "bookings_update_own_or_host" ON bookings;
CREATE POLICY "bookings_update_own_or_host"
  ON bookings FOR UPDATE TO authenticated
  USING (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = bookings.listing_id
      AND listings.host_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = bookings.listing_id
      AND listings.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bookings_delete_own" ON bookings;
CREATE POLICY "bookings_delete_own"
  ON bookings FOR DELETE TO authenticated USING (auth.uid() = student_id);

CREATE INDEX IF NOT EXISTS listings_city_idx ON listings(city);
CREATE INDEX IF NOT EXISTS listings_host_idx ON listings(host_id);
CREATE INDEX IF NOT EXISTS bookings_student_idx ON bookings(student_id);
CREATE INDEX IF NOT EXISTS bookings_listing_idx ON bookings(listing_id);
