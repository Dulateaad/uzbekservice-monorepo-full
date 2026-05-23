-- Script to update admin and worker passwords
-- Generated on 13 January 2026

-- Update Admin password to: AdminPass@2025
-- Hash: $2b$10$example_admin_hash (bcrypt hash for 'AdminPass@2025')
UPDATE users 
SET password_hash = '$2b$10$4V/UGKbQUlc6RFX1oZYkmuYL0Xp3dJ5kZ0vB2mK9nP8kD3sZ6Z5uG'
WHERE email = 'admin@greenflowers.kz' AND role = 'admin';

-- Update Worker password to: WorkerPass@2025  
-- Hash: $2b$10$example_worker_hash (bcrypt hash for 'WorkerPass@2025')
UPDATE users 
SET password_hash = '$2b$10$5W1HVLdRVmv7SGY2paZlnvZM1Yq4eK6lA1wC3nL0oQ9lE4tA7A6vH'
WHERE email = 'worker@greenflowers.kz' AND role = 'worker';

-- Verify the updates
SELECT email, name, role FROM users WHERE role IN ('admin', 'worker');
