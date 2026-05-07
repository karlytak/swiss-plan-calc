import { computeStrategy } from "../src/lib/director-compensation";
import type { DirectorInputs, CompensationStrategy } from "../src/lib/director-compensation/types";
import { CORPORATE_TAX_RATE, DIVIDEND_TAXABLE, FAMILY_ALLOWANCE_RATE } from "../src/lib/director-compensation/parameters-2026";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 }).format(n) + " CHF";

function present(label: string, inputs: DirectorInputs, strategy: CompensationStrategy) {
  const r = computeStrategy(inputs, strategy);
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  " + label);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Bénéfice total : ${fmt(inputs.totalProfit)}`);
  console.log(`Stratégie : ${strategy.salaryPct}% salaire / ${strategy.dividendPct}% div / ${strategy.retainedPct}% réserves`);
  console.log(`Dirigeant : ${inputs.status}, ${inputs.children ?? 0} enfant(s), ${inputs.age} ans, canton ${inputs.directorCanton}`);
  console.log(`Société : siège ${inputs.companyCanton}, plan LPP ${inputs.lppPlan}, qualifié=${inputs.qualifiedHolding}`);

  console.log("\n── CÔTÉ SOCIÉTÉ ─────────────────────────────────────────────");
  console.log(`Salaire brut versé             : ${fmt(r.company.grossSalary)}`);
  console.log(`Charges sociales EMPLOYEUR :`);
  console.log(`  - AVS/AI/APG (5.3%)          : ${fmt(r.company.employerCharges.avs)}`);
  console.log(`  - AC (1.1% plafond 148'200)  : ${fmt(r.company.employerCharges.ac)}`);
  console.log(`  - Allocations familiales     : ${fmt(r.company.employerCharges.familyAllowance)} (taux ${(FAMILY_ALLOWANCE_RATE[inputs.companyCanton] * 100).toFixed(2)}%)`);
  console.log(`  - LAA pro (1.0%)             : ${fmt(r.company.employerCharges.laaProfessional)}`);
  console.log(`  - LPP (employeur, 50%)       : ${fmt(r.company.employerCharges.lpp)}`);
  console.log(`  TOTAL charges employeur      : ${fmt(r.company.employerCharges.total)}`);
  console.log(`Coût total salaire pour société: ${fmt(r.company.totalSalaryCost)}`);
  console.log(`Bénéfice avant IS              : ${fmt(r.company.profitBeforeCorporateTax)}`);
  console.log(`Impôt société (${(CORPORATE_TAX_RATE[inputs.companyCanton] * 100).toFixed(1)}% ${inputs.companyCanton}) : ${fmt(r.company.corporateTax)}`);
  console.log(`Bénéfice net société           : ${fmt(r.company.netProfitAfterTax)}`);
  console.log(`Dividendes ciblés              : ${fmt(r.company.dividendsTargeted)}`);
  console.log(`Réserves ciblées               : ${fmt(r.company.retainedTargeted)}`);
  if (r.company.dividendShortfall) {
    console.log(`⚠️  SHORTFALL : bénéfice net insuffisant, cap appliqué`);
  }
  console.log(`Dividendes effectivement versés: ${fmt(r.company.dividendsPaid)}`);
  console.log(`Réserves conservées            : ${fmt(r.company.retainedActual)}`);

  console.log("\n── CÔTÉ DIRIGEANT (personne physique) ───────────────────────");
  console.log(`Cotisations sociales SALARIÉ :`);
  console.log(`  - AVS/AI/APG (5.3%)          : ${fmt(r.director.employeeCharges.avs)}`);
  console.log(`  - AC (1.1%)                  : ${fmt(r.director.employeeCharges.ac)}`);
  console.log(`  - LAA non pro (1.4%)         : ${fmt(r.director.employeeCharges.laaNonProfessional)}`);
  console.log(`  - LPP (salarié, 50%)         : ${fmt(r.director.employeeCharges.lpp)}`);
  console.log(`  TOTAL cotis. salarié         : ${fmt(r.director.employeeCharges.total)}`);
  console.log(`Salaire NET                    : ${fmt(r.director.netSalary)}`);
  console.log(`Dividendes reçus               : ${fmt(r.director.dividendsReceived)}`);
  const fedFrac = r.director.dividendFederalFraction;
  const cantFrac = r.director.dividendCantonalFraction;
  console.log(`Imposition partielle dividende :`);
  console.log(`  - Fraction fédérale          : ${(fedFrac * 100).toFixed(0)}%  → imposable IFD = ${fmt(r.director.dividendsReceived * fedFrac)}`);
  console.log(`  - Fraction cantonale ${inputs.directorCanton}      : ${(cantFrac * 100).toFixed(0)}%  → imposable ICC = ${fmt(r.director.dividendsReceived * cantFrac)}`);
  console.log(`Base imposable IFD             : ${fmt(r.director.taxableIncomeIFD)}`);
  console.log(`Base imposable ICC             : ${fmt(r.director.taxableIncomeICC)}`);
  console.log(`IFD                            : ${fmt(r.director.ifd)}`);
  console.log(`Cantonal                       : ${fmt(r.director.cantonal)}`);
  console.log(`Communal                       : ${fmt(r.director.communal)}`);
  console.log(`Paroissial                     : ${fmt(r.director.church)}`);
  console.log(`TOTAL impôt revenu             : ${fmt(r.director.totalIncomeTax)}`);

  console.log("\n── SYNTHÈSE ─────────────────────────────────────────────────");
  console.log(`💰 Net dans la poche dirigeant : ${fmt(r.directorNet)}`);
  console.log(`💼 Réserves société            : ${fmt(r.retainedInCompany)}`);
  console.log(`🔴 Total impôts + cotisations  : ${fmt(r.totalTaxAndCharges)}`);
  console.log(`────────────────────────────────────────────`);
  console.log(`Réconciliation (doit ≈ 0)      : ${r.reconciliation.toFixed(2)} CHF`);
  if (r.warnings.length) {
    console.log(`\n⚠️  Avertissements :`);
    r.warnings.forEach((w) => console.log(`  • ${w}`));
  }
}

const cas1: DirectorInputs = {
  totalProfit: 200_000,
  companyCanton: "GE", directorCanton: "GE",
  status: "single", children: 0, age: 35,
  lppPlan: "mandatory", qualifiedHolding: true, confession: "none",
};
present("CAS 1 — Sàrl GE 200k / célibataire 35 ans / 70-30-0",
  cas1, { salaryPct: 70, dividendPct: 30, retainedPct: 0 });

const cas2: DirectorInputs = {
  totalProfit: 400_000,
  companyCanton: "VD", directorCanton: "VD",
  status: "married", children: 2, age: 45,
  lppPlan: "executive_1e", qualifiedHolding: true, confession: "none",
};
present("CAS 2 — SA Vaud 400k / marié 2 enfants 45 ans / 50-50-0 / plan cadre",
  cas2, { salaryPct: 50, dividendPct: 50, retainedPct: 0 });

const cas3: DirectorInputs = {
  totalProfit: 100_000,
  companyCanton: "VS", directorCanton: "VS",
  status: "single", children: 0, age: 30,
  lppPlan: "mandatory", qualifiedHolding: true, confession: "none",
};
present("CAS 3 — Sàrl Sion 100k / célibataire 30 ans / 100-0-0",
  cas3, { salaryPct: 100, dividendPct: 0, retainedPct: 0 });

console.log("\n");
