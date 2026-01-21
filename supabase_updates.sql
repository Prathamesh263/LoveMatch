-- Add zodiac_sign and personality_type columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS zodiac_sign text,
ADD COLUMN IF NOT EXISTS personality_type text;

-- Add check constraints to ensure validity (Optional but good practice)
-- ALTER TABLE public.profiles ADD CONSTRAINT valid_zodiac CHECK (zodiac_sign IN ('Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'));
-- ALTER TABLE public.profiles ADD CONSTRAINT valid_personality CHECK (personality_type IN ('INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'));
