import { ZodiacSign, PersonalityType, Profile } from '@/types';

// --- Zodiac Logic ---

export const ZODIAC_SIGNS: ZodiacSign[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export function getZodiacSign(date: Date | string): ZodiacSign {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1; // 1-12

    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
    if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
    if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
    if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
    if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
    return 'Pisces';
}

const ZODIAC_ELEMENTS: Record<ZodiacSign, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water'
};

export function getZodiacCompatibility(sign1: ZodiacSign, sign2: ZodiacSign): { score: number; label: string } {
    if (!sign1 || !sign2) return { score: 50, label: 'Neutral' };

    const elem1 = ZODIAC_ELEMENTS[sign1];
    const elem2 = ZODIAC_ELEMENTS[sign2];

    if (sign1 === sign2) return { score: 90, label: 'Soulmates' };

    // High Compatibility
    if (
        (elem1 === 'Fire' && elem2 === 'Air') || (elem1 === 'Air' && elem2 === 'Fire') ||
        (elem1 === 'Water' && elem2 === 'Earth') || (elem1 === 'Earth' && elem2 === 'Water')
    ) {
        return { score: 85, label: 'High Compatibility' };
    }

    // Same Element (Trine)
    if (elem1 === elem2) {
        return { score: 80, label: 'Strong Connection' };
    }

    // Opposites (can be hit or miss, usually intense)
    // Simplified logic for "Opposites Attract" roughly mapped
    const opposites: Record<string, string> = {
        Aries: 'Libra', Taurus: 'Scorpio', Gemini: 'Sagittarius', Cancer: 'Capricorn',
        Leo: 'Aquarius', Virgo: 'Pisces'
    };
    if (opposites[sign1] === sign2 || opposites[sign2] === sign1) {
        return { score: 75, label: 'Opposites Attract' };
    }

    return { score: 60, label: 'Balanced' };
}

// --- Personality Logic (MBTI) ---

const MBTI_GROUPS: Record<string, string[]> = {
    Analysts: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
    Diplomats: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
    Sentinels: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
    Explorers: ['ISTP', 'ISFP', 'ESTP', 'ESFP']
};

export function getPersonalityCompatibility(type1: PersonalityType, type2: PersonalityType): { score: number; label: string } {
    if (!type1 || !type2) return { score: 50, label: 'Unknown' };

    // Simplified MBTI Compatibility Logic
    const t1Group = Object.keys(MBTI_GROUPS).find(k => MBTI_GROUPS[k].includes(type1));
    const t2Group = Object.keys(MBTI_GROUPS).find(k => MBTI_GROUPS[k].includes(type2));

    if (t1Group === t2Group) {
        return { score: 80, label: 'Similar Values' };
    }

    // Analysts + Diplomats = Good matches usually (N types)
    if ((t1Group === 'Analysts' && t2Group === 'Diplomats') || (t1Group === 'Diplomats' && t2Group === 'Analysts')) {
        return { score: 85, label: 'Intellectual Match' };
    }

    // Sentinels + Explorers (S types)
    if ((t1Group === 'Sentinels' && t2Group === 'Explorers') || (t1Group === 'Explorers' && t2Group === 'Sentinels')) {
        return { score: 85, label: 'Practical Match' };
    }

    return { score: 65, label: 'Complementary' };
}


// --- Final Calculation ---

export interface MatchResult {
    totalScore: number;
    zodiac: { score: number; label: string; sign1: ZodiacSign; sign2: ZodiacSign };
    personality: { score: number; label: string; type1?: PersonalityType; type2?: PersonalityType };
    explanation: string;
}

export function calculateMatchScore(p1: Profile, p2: Profile): MatchResult {
    // 1. Zodiac Compatibility
    // Ensure we have Zodiacs. If not, try to calc from DOB
    const z1 = p1.zodiac_sign || (p1.dob ? getZodiacSign(p1.dob) : undefined);
    const z2 = p2.zodiac_sign || (p2.dob ? getZodiacSign(p2.dob) : undefined);

    const zMatch = (z1 && z2)
        ? { ...getZodiacCompatibility(z1, z2), sign1: z1, sign2: z2 }
        : { score: 50, label: 'Unknown', sign1: z1 as ZodiacSign, sign2: z2 as ZodiacSign }; // Cast for strict TS if needed, logic handles undefined

    // 2. Personality
    const mbMatch = (p1.personality_type && p2.personality_type)
        ? { ...getPersonalityCompatibility(p1.personality_type, p2.personality_type), type1: p1.personality_type, type2: p2.personality_type }
        : { score: 50, label: 'Unknown', type1: p1.personality_type, type2: p2.personality_type };

    // 3. Weighted Score
    // If we have both, 50/50. If one missing, 100% on other.
    let total = 50;
    if (z1 && z2 && p1.personality_type && p2.personality_type) {
        total = Math.round(zMatch.score * 0.5 + mbMatch.score * 0.5);
    } else if (z1 && z2) {
        total = zMatch.score;
    } else if (p1.personality_type && p2.personality_type) {
        total = mbMatch.score;
    }

    // 4. Explanation
    let explanation = '';
    if (zMatch.label !== 'Unknown') {
        explanation += `${z1} and ${z2}: ${zMatch.label}. `;
    }
    if (mbMatch.label !== 'Unknown') {
        explanation += `${p1.personality_type} + ${p2.personality_type}: ${mbMatch.label}.`;
    }
    if (!explanation) explanation = "Complete your profiles to see compatibility insights!";

    return {
        totalScore: total,
        zodiac: zMatch,
        personality: mbMatch,
        explanation
    };
}
