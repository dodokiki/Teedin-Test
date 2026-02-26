# Teedin - Real Estate Platform

Teedin is a real estate platform that helps users find homes, condos, and land more easily.

## Setup Instructions

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase account

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Maps API Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Twilio Configuration (Optional - for SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SID=your_twilio_verify_sid
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Maps JavaScript API
4. Create an API key
5. Add the API key to your `.env.local` file (as shown above)

**Note:** Make sure to restrict your API key to prevent unauthorized usage. You can restrict it by:

- Application restrictions (HTTP referrers)
- API restrictions (only enable Maps JavaScript API)

### Database Setup

1. Create a new Supabase project
2. Run the following SQL in the Supabase SQL editor to create the necessary tables:

```sql
-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    listing_type TEXT[] NOT NULL, -- ARRAY เช่น ["ขาย", "เช่า"]
    property_category VARCHAR(50) NOT NULL, -- เช่น บ้านเดี่ยว, คอนโด
    in_project BOOLEAN,
    rental_duration VARCHAR(20), -- เช่น 3 เดือน, 6 เดือน, อื่นๆ
    location JSONB, -- เก็บข้อมูลแผนที่ เช่น lat, lng, address
    created_at TIMESTAMP DEFAULT now()
);

-- Create property details table
CREATE TABLE property_details (
    property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
    project_name VARCHAR(255),
    address TEXT,
    usable_area FLOAT, -- พื้นที่ใช้สอย ตร.ม.
    bedrooms INT,
    bathrooms INT,
    parking_spaces INT,
    house_condition TEXT,
    highlight TEXT,
    area_around TEXT,
    facilities TEXT[],
    project_facilities TEXT[],
    description TEXT,
    price NUMERIC(12,2),
    images TEXT[] -- URL ของรูปภาพ jpg/png (สูงสุด 6 รูป)
);

-- Create a dummy user for testing
INSERT INTO users (id, email, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'Test Agent');
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn
   ```
   or
   ```
   pnpm install
   ```

### Migrating Sample Data

Run the data migration script to populate the database with sample properties:

```
node scripts/migrate-data-to-supabase.js
```

### Running the Application

Start the development server:

```
npm run dev
```

or

```
yarn dev
```

or

```
pnpm run dev
```

Visit `http://localhost:3000` to view the application.

## Project Structure

- `app/` - Next.js app directory containing pages and layouts
- `components/` - Reusable UI components
- `data/` - Static data (used only for reference)
- `public/` - Static assets
- `scripts/` - Utility scripts
- `utils/` - Utility functions, including Supabase client

## Features

- Property listings with filtering
- Property details
- Location-based search
- Featured properties
- Popular locations

## Technology Stack

- Next.js
- React
- Tailwind CSS
- Supabase (PostgreSQL database)

## Quick Start with pnpm

- npm install -g pnpm
- pnpm install
- pnpm run dev
"# teedin" 
"# teedin" 
# teedin
