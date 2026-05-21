// Taux de change officiels AFC (cours fiscaux annuels CH) et taux marché ECB/BNS.
//
// Sources :
//  - AFC (Administration fédérale des contributions) : taux moyens annuels
//    publiés à l'attention des contribuables pour conversion des revenus/
//    fortune étrangers. https://www.estv.admin.ch (Notices A1/A1a, taux annuels).
//  - BNS (Banque nationale suisse) : taux de change journaliers de référence.
//    Portail data.snb.ch — interrogeable côté serveur.
//  - ECB (Banque centrale européenne) : taux de référence EUR. Proxy gratuit
//    sans clé : https://api.frankfurter.app/ (basé ECB).
//
// Ces taux servent de base de comparaison pour les réclamations fiscales :
//   « Taux AFC retenu » vs « Taux réel à la date de transaction (BNS/ECB) ».

export type Currency = "EUR" | "USD" | "GBP";

/**
 * Taux moyens annuels AFC — 1 unité de devise = X CHF.
 * Valeurs publiées (notices AFC). À mettre à jour chaque année fiscale.
 */
export const AFC_ANNUAL_RATES: Record<number, Partial<Record<Currency, number>>> = {
  2020: { EUR: 1.0705, USD: 0.9395, GBP: 1.2050 },
  2021: { EUR: 1.0811, USD: 0.9145, GBP: 1.2576 },
  2022: { EUR: 1.0047, USD: 0.9558, GBP: 1.1812 },
  2023: { EUR: 0.9716, USD: 0.8984, GBP: 1.1175 },
  2024: { EUR: 0.9518, USD: 0.8800, GBP: 1.1230 },
  2025: { EUR: 0.9376, USD: 0.8500, GBP: 1.1100 },
};

export function getAfcRate(year: number, currency: Currency): number | null {
  return AFC_ANNUAL_RATES[year]?.[currency] ?? null;
}

export const SUPPORTED_CURRENCIES: Currency[] = ["EUR", "USD", "GBP"];
