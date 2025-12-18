import type {
  ContributionStreak,
  TotalContributions,
  AutoSaveEnabled,
  AutoSaveTime,
  InterestRate,
} from "../schemas";

import { CurrencyCodeSchema } from "../schemas";
import { RewardsBadgeTypeEnum } from "./enums";

export * from "./enums";

/**
 * Default values for common schemas
 */
export const DEFAULT_CONTRIBUTION_STREAK = 0 as ContributionStreak;
export const DEFAULT_TOTAL_CONTRIBUTIONS = 0 as TotalContributions;
export const DEFAULT_AUTO_SAVE_ENABLED = false as AutoSaveEnabled;
export const DEFAULT_AUTO_SAVE_TIME = "09:00" as AutoSaveTime;
export const DEFAULT_INTEREST_RATE = 0.0 as InterestRate;

/**
 * Currency codes
 */
export const CURRENCY_CODES = ["NGN", "USD", "EUR", "GBP"] as const;

/**
 * Default currency
 */
export const DEFAULT_CURRENCY = CurrencyCodeSchema.make("NGN");

/**
 * Total number of rewards badges
 */
export const TotalRewards = Object.values(RewardsBadgeTypeEnum).length;

/**
 * Lagos LGAs
 */
export const LGAS = [
  "Agbado/Oke-Odo",
  "Epe",
  "Ikeja",
  "Odi Olowo/Ojuwoye",
  "Agboyi/Ketu",
  "Eredo",
  "Ikorodu North",
  "Ojo",
  "Agege",
  "Eti Osa East",
  "Ikorodu West",
  "Ojodu",
  "Ajeromi LGA",
  "Eti Osa West",
  "Ikosi Ejinrin",
  "Ojokoro",
  "Alimosho",
  "Iba",
  "Ikorodu",
  "Olorunda",
  "Apapa",
  "Isolo",
  "Iru/Victoria Island",
  "Onigbongbo",
  "Apapa-Iganmu",
  "Imota",
  "Itire Ikate",
  "Oriade",
  "Ayobo/Ipaja",
  "Ikoyi-Obalende",
  "Kosofe",
  "Orile Agege",
  "Badagry West",
  "Ibeju",
  "Lagos West",
  "Oshodi",
  "Badagry",
  "Ifako Ijaiye",
  "Lagos East",
  "Oto-Awori",
  "Bariga",
  "Ifelodun",
  "Lagos Mainland",
  "Shomolu",
  "Coker Aguda",
  "Igando/Ikotun",
  "Lekki",
  "Surulere",
  "Egbe Idimu",
  "Igbogbo/Bayeku",
  "Mosan/Okunola",
  "Yaba",
  "Ejigbo",
  "Ijede",
  "Mushin",
] as const;

/**
 * Nigerian states
 */
export const STATES = [
  "abia",
  "adamawa",
  "akwa ibom",
  "anambra",
  "bauchi",
  "bayelsa",
  "benue",
  "borno",
  "cross river",
  "delta",
  "ebonyi",
  "edo",
  "ekiti",
  "enugu",
  "gombe",
  "imo",
  "jigawa",
  "kaduna",
  "kano",
  "katsina",
  "kebbi",
  "kogi",
  "kwara",
  "lagos",
  "nasarawa",
  "niger",
  "ogun",
  "ondo",
  "osun",
  "oyo",
  "plateau",
  "rivers",
  "sokoto",
  "taraba",
  "yobe",
  "zamfara",
  "fct", // Federal Capital Territory
] as const;

export const AVAILABLE_CITIES = [] as const;
