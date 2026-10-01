-- =================================================================
-- HostAbroad.ca — MySQL Schema Export
-- Database: u396247786_Host_abroad
-- User:     u396247786_Host_abroad1
-- Generated: 2026-10-01
--
-- This file converts the Supabase/PostgreSQL schema to MySQL 8.0+.
-- Key differences from the original Postgres schema:
--   1. UUIDs use CHAR(36) with a BEFORE INSERT trigger to auto-generate.
--   2. Supabase auth.users → separate `users` table with email + password hash.
--   3. PostgreSQL text[] arrays (amenities, photo_urls) → junction tables.
--   4. Row Level Security policies → not available in MySQL; enforce at
--      the application layer or via stored procedures / views with grants.
--   5. SECURITY DEFINER admin functions → MySQL stored procedures.
--   6. timestamptz → DATETIME DEFAULT CURRENT_TIMESTAMP.
-- =================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- =================================================================
-- TABLE: users  (replaces Supabase auth.users)
-- =================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- TABLE: profiles
-- =================================================================
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_type` ENUM('student','host','admin') NOT NULL DEFAULT 'student',
  `full_name` VARCHAR(255) NOT NULL DEFAULT '',
  `phone` VARCHAR(50) NOT NULL DEFAULT '',
  `country` VARCHAR(100) NOT NULL DEFAULT '',
  `city` VARCHAR(100) NOT NULL DEFAULT '',
  `bio` TEXT,
  `avatar_url` TEXT,
  `registration_paid` TINYINT(1) NOT NULL DEFAULT 0,
  `registration_fee_paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_profiles_users` FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- TABLE: listings  (homestay property — one per host)
-- =================================================================
CREATE TABLE IF NOT EXISTS `listings` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `host_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT,
  `city` VARCHAR(100) NOT NULL DEFAULT '',
  `neighbourhood` VARCHAR(255) DEFAULT NULL,
  `price_per_month` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `room_type` ENUM('Private room','Shared room','Studio') NOT NULL DEFAULT 'Private room',
  `meals_included` TINYINT(1) NOT NULL DEFAULT 0,
  `available_from` DATE NULL,
  `available_to` DATE NULL,
  `max_stay_months` INT NOT NULL DEFAULT 12,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_listings_profiles` FOREIGN KEY (`host_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  INDEX `idx_listings_city` (`city`),
  INDEX `idx_listings_host` (`host_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- TABLE: rooms  (multiple rooms per homestay)
-- =================================================================
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `listing_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT,
  `room_type` ENUM('Private room','Shared room','Studio') NOT NULL DEFAULT 'Private room',
  `beds` INT NOT NULL DEFAULT 1,
  `price_per_month` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `available_from` DATE NULL,
  `available_to` DATE NULL,
  `max_stay_months` INT NOT NULL DEFAULT 12,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rooms_listings` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rooms_beds` CHECK (`beds` >= 1),
  INDEX `idx_rooms_listing` (`listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- TABLE: bookings
-- =================================================================
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `student_id` CHAR(36) NOT NULL,
  `listing_id` CHAR(36) NOT NULL,
  `room_id` CHAR(36) NULL,
  `check_in` DATE NOT NULL,
  `check_out` DATE NOT NULL,
  `months` INT NOT NULL DEFAULT 1,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  `stripe_session_id` VARCHAR(255) DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bookings_profiles` FOREIGN KEY (`student_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_listings` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL,
  INDEX `idx_bookings_student` (`student_id`),
  INDEX `idx_bookings_listing` (`listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =================================================================
-- JUNCTION TABLES (replace PostgreSQL text[] arrays)
-- =================================================================

-- Listing amenities (was: listings.amenities text[])
CREATE TABLE IF NOT EXISTS `listing_amenities` (
  `listing_id` CHAR(36) NOT NULL,
  `amenity` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`listing_id`, `amenity`),
  CONSTRAINT `fk_amenities_listings` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Listing photos (was: listings.photo_urls text[])
CREATE TABLE IF NOT EXISTS `listing_photos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `listing_id` CHAR(36) NOT NULL,
  `url` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  CONSTRAINT `fk_photos_listings` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE,
  INDEX `idx_photos_listing` (`listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Room photos (was: rooms.photo_urls text[])
CREATE TABLE IF NOT EXISTS `room_photos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `room_id` CHAR(36) NOT NULL,
  `url` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  CONSTRAINT `fk_photos_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  INDEX `idx_photos_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =================================================================
-- UUID AUTO-GENERATION TRIGGERS
-- MySQL doesn't have gen_random_uuid(), so we use triggers.
-- =================================================================
DELIMITER //

CREATE TRIGGER IF NOT EXISTS `trg_users_uuid`
BEFORE INSERT ON `users`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = REPLACE(UUID(), '-', '');
  END IF;
END//

CREATE TRIGGER IF NOT EXISTS `trg_profiles_uuid`
BEFORE INSERT ON `profiles`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = REPLACE(UUID(), '-', '');
  END IF;
END//

CREATE TRIGGER IF NOT EXISTS `trg_listings_uuid`
BEFORE INSERT ON `listings`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = REPLACE(UUID(), '-', '');
  END IF;
END//

CREATE TRIGGER IF NOT EXISTS `trg_rooms_uuid`
BEFORE INSERT ON `rooms`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = REPLACE(UUID(), '-', '');
  END IF;
END//

CREATE TRIGGER IF NOT EXISTS `trg_bookings_uuid`
BEFORE INSERT ON `bookings`
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = REPLACE(UUID(), '-', '');
  END IF;
END//

DELIMITER ;

-- =================================================================
-- STORED PROCEDURE: Admin — read all profiles
-- (replaces Postgres SECURITY DEFINER function admin_read_profiles)
-- =================================================================
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS `admin_read_profiles`(IN p_requester_id CHAR(36))
BEGIN
  DECLARE v_is_admin TINYINT;
  SELECT COUNT(*) INTO v_is_admin FROM `profiles` WHERE `id` = p_requester_id AND `user_type` = 'admin';
  IF v_is_admin = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not authorized';
  END IF;
  SELECT * FROM `profiles` ORDER BY `created_at` DESC;
END//

-- =================================================================
-- STORED PROCEDURE: Admin — read all listings with host info
-- (replaces Postgres SECURITY DEFINER function admin_read_listings)
-- =================================================================
CREATE PROCEDURE IF NOT EXISTS `admin_read_listings`(IN p_requester_id CHAR(36))
BEGIN
  DECLARE v_is_admin TINYINT;
  SELECT COUNT(*) INTO v_is_admin FROM `profiles` WHERE `id` = p_requester_id AND `user_type` = 'admin';
  IF v_is_admin = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not authorized';
  END IF;
  SELECT
    l.id, l.host_id, l.title, l.description, l.city, l.neighbourhood,
    l.price_per_month, l.room_type, l.meals_included,
    l.available_from, l.available_to, l.max_stay_months, l.created_at,
    p.full_name AS host_name,
    u.email AS host_email
  FROM `listings` l
  LEFT JOIN `profiles` p ON p.id = l.host_id
  LEFT JOIN `users` u ON u.id = l.host_id
  ORDER BY l.created_at DESC;
END//

-- =================================================================
-- STORED PROCEDURE: Admin — read all bookings with listing + student info
-- (replaces Postgres SECURITY DEFINER function admin_read_bookings)
-- =================================================================
CREATE PROCEDURE IF NOT EXISTS `admin_read_bookings`(IN p_requester_id CHAR(36))
BEGIN
  DECLARE v_is_admin TINYINT;
  SELECT COUNT(*) INTO v_is_admin FROM `profiles` WHERE `id` = p_requester_id AND `user_type` = 'admin';
  IF v_is_admin = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not authorized';
  END IF;
  SELECT
    b.id, b.student_id, b.listing_id, b.room_id,
    b.check_in, b.check_out, b.months, b.total_amount,
    b.status, b.stripe_session_id, b.created_at,
    l.title AS listing_title,
    l.city AS listing_city,
    p.full_name AS student_name,
    u.email AS student_email
  FROM `bookings` b
  LEFT JOIN `listings` l ON l.id = b.listing_id
  LEFT JOIN `profiles` p ON p.id = b.student_id
  LEFT JOIN `users` u ON u.id = b.student_id
  ORDER BY b.created_at DESC;
END//

DELIMITER ;

-- =================================================================
-- HELPER VIEW: listings with amenities as comma-separated string
-- (convenience for queries that need the old amenities array format)
-- =================================================================
CREATE OR REPLACE VIEW `v_listings_with_amenities` AS
SELECT
  l.*,
  GROUP_CONCAT(DISTINCT la.amenity ORDER BY la.amenity SEPARATOR ', ') AS amenities_csv
FROM `listings` l
LEFT JOIN `listing_amenities` la ON la.listing_id = l.id
GROUP BY l.id;

-- =================================================================
-- DONE
-- To make a user an admin:
--   UPDATE profiles SET user_type = 'admin' WHERE id = '<user-uuid>';
--
-- To insert a new user + profile (application should handle password hashing):
--   INSERT INTO users (id, email, password_hash) VALUES (UUID(), 'student@example.com', '<bcrypt_hash>');
--   INSERT INTO profiles (id, user_type, full_name) VALUES (LAST_INSERT_ID(), 'student', 'Jane Doe');
--   -- Note: use the same UUID for both inserts; see trigger auto-generation.
-- =================================================================
