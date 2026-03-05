-- Add optional channel display names so landlords can map "Property name" from Booking.com / Airbnb / VRBO to our property.
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "name_booking_com" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "name_airbnb" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "name_vrbo" TEXT;
