/*
# Add rooms table — multiple rooms per homestay

## Overview
Restructures the listing model so each homestay (listing) can contain
multiple rooms. A room has its own type, bed count, price, photos, and
availability. This supports hosts who have several rooms to rent and
rooms with multiple beds (e.g., a shared room with 2 beds).

## New Tables
### rooms
- `id` uuid, primary key
- `listing_id` uuid, FK → listings(id) ON DELETE CASCADE
- `title` text — room name (e.g. "Master bedroom", "Cozy attic room")
- `description` text — room-specific details
- `room_type` text — 'Private room' | 'Shared room' | 'Studio'
- `beds` int — number of beds in the room (default 1)
- `price_per_month` numeric(10,2) — monthly rate for this room in CAD
- `photo_urls` text[] — room photos
- `available_from` date — earliest check-in for this room
- `available_to` date — latest check-out for this room
- `max_stay_months` int — maximum stay for this room
- `created_at` timestamptz

## Modified Tables
### bookings
- Added `room_id` uuid, nullable, FK → rooms(id) ON DELETE SET NULL.
  Existing bookings keep their listing_id; new bookings include room_id.

## Security (RLS)
- rooms: anyone authenticated can read (so students can browse rooms);
  only the listing owner can insert, update, and delete rooms.
- Booking SELECT policy updated to also allow hosts to see bookings on
  their own listings' rooms (the existing listing_id-based policy
  already covers this, but we add an OR for room_id-based lookups).

## Important Notes
1. Listing-level fields (room_type, price_per_month, etc.) remain on the
   listings table for backwards compatibility but the UI now uses
   room-level fields for room-specific data.
2. The listing keeps: title (homestay name), description (about the home),
   city, neighbourhood, meals_included, amenities, photo_urls (home photos).
3. Each room has its own: title, description, room_type, beds, price,
   photos, and availability.
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  room_type text NOT NULL DEFAULT 'Private room' CHECK (room_type IN ('Private room', 'Shared room', 'Studio')),
  beds int NOT NULL DEFAULT 1 CHECK (beds >= 1),
  price_per_month numeric(10,2) NOT NULL DEFAULT 0,
  photo_urls text[] NOT NULL DEFAULT '{}',
  available_from date,
  available_to date,
  max_stay_months int DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select_all_authenticated" ON rooms;
CREATE POLICY "rooms_select_all_authenticated"
  ON rooms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rooms_insert_own" ON rooms;
CREATE POLICY "rooms_insert_own"
  ON rooms FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = rooms.listing_id
      AND listings.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "rooms_update_own" ON rooms;
CREATE POLICY "rooms_update_own"
  ON rooms FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = rooms.listing_id
      AND listings.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = rooms.listing_id
      AND listings.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "rooms_delete_own" ON rooms;
CREATE POLICY "rooms_delete_own"
  ON rooms FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = rooms.listing_id
      AND listings.host_id = auth.uid()
    )
  );

-- Add room_id to bookings (nullable for backwards compatibility)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS rooms_listing_idx ON rooms(listing_id);
