-- =================================================================
-- HostAbroad.ca — esquema MySQL 5.7+/8 y MariaDB 10.3+
-- Es seguro correrlo varias veces (IF NOT EXISTS).
-- Se aplica con:  npm run db:migrate
--
-- Cambios frente a hostabroad_mysql_schema.sql (el que generó Bolt):
--  * Sin triggers ni stored procedures: el servidor genera los UUID y
--    valida los permisos de admin (esa sintaxis rompe en phpMyAdmin/MariaDB).
--  * amenities y photo_urls se guardan como JSON en texto (la app ya
--    trabaja con arreglos), en vez de tablas auxiliares.
--  * Tabla payments para auditar los pagos de la cuota de registro.
-- =================================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `profiles` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_type` ENUM('student','host','admin') NOT NULL DEFAULT 'student',
  `full_name` VARCHAR(255) NOT NULL DEFAULT '',
  `phone` VARCHAR(50) NOT NULL DEFAULT '',
  `country` VARCHAR(100) NOT NULL DEFAULT '',
  `city` VARCHAR(100) NOT NULL DEFAULT '',
  `bio` TEXT NULL,
  `avatar_url` TEXT NULL,
  `registration_paid` TINYINT(1) NOT NULL DEFAULT 0,
  `registration_fee_paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_profiles_users` FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `listings` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `host_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT NULL,
  `city` VARCHAR(100) NOT NULL DEFAULT '',
  `neighbourhood` VARCHAR(255) NOT NULL DEFAULT '',
  `price_per_month` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `room_type` ENUM('Private room','Shared room','Studio') NOT NULL DEFAULT 'Private room',
  `meals_included` TINYINT(1) NOT NULL DEFAULT 0,
  `amenities` TEXT NULL,
  `photo_urls` LONGTEXT NULL,
  `available_from` DATE NULL,
  `available_to` DATE NULL,
  `max_stay_months` INT NOT NULL DEFAULT 12,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_listings_profiles` FOREIGN KEY (`host_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  INDEX `idx_listings_city` (`city`),
  INDEX `idx_listings_host` (`host_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rooms` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `listing_id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `description` TEXT NULL,
  `room_type` ENUM('Private room','Shared room','Studio') NOT NULL DEFAULT 'Private room',
  `beds` INT NOT NULL DEFAULT 1,
  `price_per_month` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `photo_urls` LONGTEXT NULL,
  `available_from` DATE NULL,
  `available_to` DATE NULL,
  `max_stay_months` INT NOT NULL DEFAULT 12,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rooms_listings` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE,
  INDEX `idx_rooms_listing` (`listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  `stripe_session_id` VARCHAR(255) NOT NULL DEFAULT '',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bookings_profiles` FOREIGN KEY (`student_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_listings` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_rooms` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL,
  INDEX `idx_bookings_student` (`student_id`),
  INDEX `idx_bookings_listing` (`listing_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` CHAR(36) NOT NULL PRIMARY KEY,
  `user_id` CHAR(36) NOT NULL,
  `kind` VARCHAR(40) NOT NULL DEFAULT 'registration_fee',
  `stripe_session_id` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `currency` CHAR(3) NOT NULL DEFAULT 'cad',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_payments_session` (`stripe_session_id`),
  CONSTRAINT `fk_payments_users` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
