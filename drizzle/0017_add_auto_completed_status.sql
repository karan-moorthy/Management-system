-- Add AUTO_COMPLETED status support
-- Update existing auto-ended records to use the new status
UPDATE attendance 
SET status = 'AUTO_COMPLETED' 
WHERE status = 'COMPLETED' 
AND end_activity LIKE '%automatically ended at midnight%';

-- The status column already accepts text, so no ALTER needed
-- Just documenting the new possible value: IN_PROGRESS, COMPLETED, AUTO_COMPLETED
