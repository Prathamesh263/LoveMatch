export type ZodiacSign =
    | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
    | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
    | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type PersonalityType =
    | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
    | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
    | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
    | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

export interface Profile {
    id: string;
    full_name: string;
    age?: number;
    dob?: string;
    gender: string;
    looking_for: string;
    bio?: string;
    interests?: string[];
    photos?: string[];
    avatar_url?: string;
    zodiac_sign?: ZodiacSign;
    personality_type?: PersonalityType;
    updated_at?: string;
}
