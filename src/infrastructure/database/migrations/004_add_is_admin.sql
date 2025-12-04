-- Добавляем колонку is_admin для админов с бесконечным балансом
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Устанавливаем админский статус для malavov70@gmail.com
UPDATE users SET is_admin = TRUE WHERE email = 'malavov70@gmail.com';
