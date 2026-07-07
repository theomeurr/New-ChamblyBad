-- Table des comptes admin BCCO (remplace data/admins.json)
-- À exécuter dans phpMyAdmin, sur la base créée dans cPanel.

CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'super') NOT NULL DEFAULT 'admin',
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Réservations de terrains (remplace data/reservations/reservations.csv comme source
-- de vérité transactionnelle — le CSV reste utilisé pour config/créneaux/licenciés,
-- qui changent rarement et ne posent pas de problème de concurrence).
CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(20) NOT NULL UNIQUE,
  date DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  duree INT UNSIGNED NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  licencie ENUM('oui','non') NOT NULL DEFAULT 'non',
  numero_licence VARCHAR(30) NULL,
  montant DECIMAL(6,2) NOT NULL,
  stripe_session_id VARCHAR(191) NULL,
  stripe_payment_intent VARCHAR(191) NULL,
  statut ENUM('pending','confirmed','cancelled','expired') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date_heure (date, heure_debut),
  INDEX idx_stripe_session (stripe_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
