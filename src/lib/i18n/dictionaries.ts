export type LocaleCode = "en" | "si" | "ta";

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

export interface Dictionary {
  nav: { howItWorks: string; vehicles: string; associations: string; drivers: string };
  nav_login: string;
  nav_getStarted: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_pickup: string;
  hero_dropoff: string;
  hero_search: string;
}

export const dictionary: Record<LocaleCode, Dictionary> = {
  en: {
    nav: { howItWorks: "How it works", vehicles: "Vehicles", associations: "For associations", drivers: "Drive with us" },
    nav_login: "Sign in",
    nav_getStarted: "Get started",
    hero_eyebrow: "Village taxi associations, now online",
    hero_title: "The ride is local. So are the earnings.",
    hero_subtitle:
      "Book a taxi, three-wheeler, van, or lorry from a verified driver in your own village taxi association — fair fares, transparent commissions, and a platform built for Sri Lanka.",
    hero_cta_primary: "Book a ride",
    hero_cta_secondary: "Drive with your association",
    hero_pickup: "Pickup location",
    hero_dropoff: "Where to?",
    hero_search: "See fare estimate",
  },
  si: {
    nav: { howItWorks: "ක්‍රියා කරන ආකාරය", vehicles: "වාහන වර්ග", associations: "සංගම් සඳහා", drivers: "රියදුරෙකු වන්න" },
    nav_login: "පිවිසෙන්න",
    nav_getStarted: "ආරම්භ කරන්න",
    hero_eyebrow: "ගම්මාන ටැක්සි සංගම් දැන් අන්තර්ජාලයේ",
    hero_title: "ගමන ලෝකලයි. ආදායමත් එසේමයි.",
    hero_subtitle:
      "ඔබේම ගම්මාන ටැක්සි සංගමයේ සත්‍යාපිත රියදුරෙකුගෙන් ටැක්සියක්, ත්‍රී රෝදයක්, වෑන් රථයක් හෝ ලොරි රථයක් වෙන් කරගන්න.",
    hero_cta_primary: "ගමනක් වෙන් කරන්න",
    hero_cta_secondary: "රියදුරෙකු ලෙස ලියාපදිංචි වන්න",
    hero_pickup: "ලබා ගැනීමේ ස්ථානය",
    hero_dropoff: "කොහෙද යන්නේ?",
    hero_search: "ගාස්තු ඇස්තමේන්තුව බලන්න",
  },
  ta: {
    nav: { howItWorks: "இது எப்படி செயல்படுகிறது", vehicles: "வாகன வகைகள்", associations: "சங்கங்களுக்கு", drivers: "ஓட்டுநராக இணையுங்கள்" },
    nav_login: "உள்நுழைய",
    nav_getStarted: "தொடங்குங்கள்",
    hero_eyebrow: "கிராம டாக்சி சங்கங்கள், இப்போது இணையத்தில்",
    hero_title: "பயணம் உள்ளூர். வருமானமும் அப்படியே.",
    hero_subtitle:
      "உங்கள் சொந்த கிராம டாக்சி சங்கத்தின் சரிபார்க்கப்பட்ட ஓட்டுநரிடமிருந்து டாக்சி, முச்சக்கர வண்டி, வேன் அல்லது லாரியை முன்பதிவு செய்யுங்கள்.",
    hero_cta_primary: "பயணம் முன்பதிவு செய்க",
    hero_cta_secondary: "ஓட்டுநராக பதிவு செய்யுங்கள்",
    hero_pickup: "ஏற்றுமதி இடம்",
    hero_dropoff: "எங்கே செல்ல வேண்டும்?",
    hero_search: "கட்டண மதிப்பீட்டை பார்க்க",
  },
};
