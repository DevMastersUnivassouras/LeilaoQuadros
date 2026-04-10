CREATE TABLE IF NOT EXISTS leilao_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT UNIQUE NOT NULL,
  birth_date DATE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'user',
  wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  wallet_reserved NUMERIC(12, 2) NOT NULL DEFAULT 0,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  profile_image_url TEXT,
  biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leilao_users
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE leilao_users
ADD COLUMN IF NOT EXISTS cpf TEXT;

ALTER TABLE leilao_users
ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE leilao_users
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE leilao_users
ADD COLUMN IF NOT EXISTS user_role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE leilao_users
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE leilao_users
ADD COLUMN IF NOT EXISTS wallet_reserved NUMERIC(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leilao_users' AND column_name = 'role'
  ) THEN
    EXECUTE 'UPDATE leilao_users SET user_role = "role" WHERE user_role IS NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leilao_users_user_role_chk'
  ) THEN
    ALTER TABLE leilao_users
    ADD CONSTRAINT leilao_users_user_role_chk CHECK (user_role IN ('user', 'admin'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS leilao_users_cpf_unico
ON leilao_users (cpf)
WHERE cpf IS NOT NULL;

CREATE TABLE IF NOT EXISTS leilao_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leilao_user_achievements (
  user_id UUID NOT NULL REFERENCES leilao_users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES leilao_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS leilao_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT,
  starting_bid NUMERIC(12, 2) NOT NULL,
  current_bid NUMERIC(12, 2) NOT NULL,
  min_increment NUMERIC(12, 2) NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  winner_user_id UUID REFERENCES leilao_users(id) ON DELETE SET NULL,
  winner_bid NUMERIC(12, 2),
  highest_bidder_user_id UUID REFERENCES leilao_users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES leilao_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leilao_auctions_status_chk CHECK (status IN ('scheduled', 'active', 'closed', 'cancelled')),
  CONSTRAINT leilao_auctions_ends_after_start CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS leilao_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES leilao_auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES leilao_users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leilao_auctions
ADD COLUMN IF NOT EXISTS highest_bidder_user_id UUID REFERENCES leilao_users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS leilao_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES leilao_users(id) ON DELETE CASCADE,
  auction_id UUID REFERENCES leilao_auctions(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  method TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leilao_wallet_transactions_type_chk CHECK (type IN ('deposit', 'reserve', 'release', 'settlement'))
);

CREATE INDEX IF NOT EXISTS leilao_wallet_transactions_user_created_idx
ON leilao_wallet_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS leilao_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL UNIQUE REFERENCES leilao_auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES leilao_users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  address_line TEXT NOT NULL,
  address_number TEXT NOT NULL,
  district TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  complement TEXT,
  map_query TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leilao_redemptions_payment_method_chk CHECK (payment_method IN ('pix_simulado', 'deposito_simulado')),
  CONSTRAINT leilao_redemptions_status_chk CHECK (status IN ('requested', 'confirmed', 'delivered'))
);

CREATE INDEX IF NOT EXISTS leilao_auctions_status_ends_idx
ON leilao_auctions (status, ends_at);

CREATE INDEX IF NOT EXISTS leilao_bids_auction_created_idx
ON leilao_bids (auction_id, created_at DESC);
