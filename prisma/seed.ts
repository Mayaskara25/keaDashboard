import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ORGANIC_CHEMISTRY_TAXONOMY = [
  // ─── GOC ──────────────────────────────────────────────────────────────────
  { conceptId: "CHEM_ORG_GOC_001", chapter: "General Organic Chemistry", topic: "Hybridisation", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_GOC_002", chapter: "General Organic Chemistry", topic: "Inductive Effect", subtopic: null, parentConceptId: "CHEM_ORG_GOC_001", prerequisites: ["CHEM_ORG_GOC_001"] },
  { conceptId: "CHEM_ORG_GOC_003", chapter: "General Organic Chemistry", topic: "Resonance", subtopic: null, parentConceptId: "CHEM_ORG_GOC_001", prerequisites: ["CHEM_ORG_GOC_001"] },
  { conceptId: "CHEM_ORG_GOC_004", chapter: "General Organic Chemistry", topic: "Hyperconjugation", subtopic: null, parentConceptId: "CHEM_ORG_GOC_001", prerequisites: ["CHEM_ORG_GOC_001"] },
  { conceptId: "CHEM_ORG_GOC_005", chapter: "General Organic Chemistry", topic: "Isomerism", subtopic: null, parentConceptId: "CHEM_ORG_GOC_001", prerequisites: ["CHEM_ORG_GOC_001"] },
  { conceptId: "CHEM_ORG_GOC_006", chapter: "General Organic Chemistry", topic: "IUPAC Nomenclature", subtopic: null, parentConceptId: null, prerequisites: [] },

  // ─── HYDROCARBONS ─────────────────────────────────────────────────────────
  { conceptId: "CHEM_ORG_HC_001", chapter: "Hydrocarbons", topic: "Alkanes", subtopic: null, parentConceptId: null, prerequisites: ["CHEM_ORG_GOC_001"] },
  { conceptId: "CHEM_ORG_HC_002", chapter: "Hydrocarbons", topic: "Alkenes", subtopic: null, parentConceptId: "CHEM_ORG_HC_001", prerequisites: ["CHEM_ORG_HC_001"] },
  { conceptId: "CHEM_ORG_HC_003", chapter: "Hydrocarbons", topic: "Alkynes", subtopic: null, parentConceptId: "CHEM_ORG_HC_002", prerequisites: ["CHEM_ORG_HC_002"] },
  { conceptId: "CHEM_ORG_HC_004", chapter: "Hydrocarbons", topic: "Arenes and Aromaticity", subtopic: null, parentConceptId: null, prerequisites: ["CHEM_ORG_GOC_003"] },
  { conceptId: "CHEM_ORG_HC_005", chapter: "Hydrocarbons", topic: "Markovnikov Rule", subtopic: null, parentConceptId: "CHEM_ORG_HC_002", prerequisites: ["CHEM_ORG_HC_002"] },

  // ─── HALOALKANES ──────────────────────────────────────────────────────────
  { conceptId: "CHEM_ORG_HALO_001", chapter: "Haloalkanes and Haloarenes", topic: "Classification of Haloalkanes", subtopic: null, parentConceptId: null, prerequisites: ["CHEM_ORG_HC_001"] },
  { conceptId: "CHEM_ORG_HALO_002", chapter: "Haloalkanes and Haloarenes", topic: "SN1 Reaction", subtopic: null, parentConceptId: "CHEM_ORG_HALO_001", prerequisites: ["CHEM_ORG_HALO_001"] },
  { conceptId: "CHEM_ORG_HALO_003", chapter: "Haloalkanes and Haloarenes", topic: "SN2 Reaction", subtopic: null, parentConceptId: "CHEM_ORG_HALO_001", prerequisites: ["CHEM_ORG_HALO_001"] },
  { conceptId: "CHEM_ORG_HALO_004", chapter: "Haloalkanes and Haloarenes", topic: "Elimination Reactions", subtopic: null, parentConceptId: "CHEM_ORG_HALO_001", prerequisites: ["CHEM_ORG_HALO_001", "CHEM_ORG_HC_002"] },
  { conceptId: "CHEM_ORG_HALO_005", chapter: "Haloalkanes and Haloarenes", topic: "Haloarenes", subtopic: null, parentConceptId: null, prerequisites: ["CHEM_ORG_HC_004"] },

  // ─── ALCOHOLS PHENOLS ETHERS ──────────────────────────────────────────────
  { conceptId: "CHEM_ORG_APE_001", chapter: "Alcohols, Phenols and Ethers", topic: "Classification and Structure", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_APE_002", chapter: "Alcohols, Phenols and Ethers", topic: "Acidity of Alcohols and Phenols", subtopic: null, parentConceptId: "CHEM_ORG_APE_001", prerequisites: ["CHEM_ORG_APE_001", "CHEM_ORG_GOC_002"] },
  { conceptId: "CHEM_ORG_APE_003", chapter: "Alcohols, Phenols and Ethers", topic: "Lucas Test", subtopic: null, parentConceptId: "CHEM_ORG_APE_001", prerequisites: ["CHEM_ORG_APE_001"] },
  { conceptId: "CHEM_ORG_APE_004", chapter: "Alcohols, Phenols and Ethers", topic: "Reactions of Alcohols", subtopic: null, parentConceptId: "CHEM_ORG_APE_001", prerequisites: ["CHEM_ORG_APE_001"] },
  { conceptId: "CHEM_ORG_APE_005", chapter: "Alcohols, Phenols and Ethers", topic: "Ethers", subtopic: null, parentConceptId: null, prerequisites: ["CHEM_ORG_APE_001"] },

  // ─── ALDEHYDES KETONES CARBOXYLIC ACIDS ───────────────────────────────────
  { conceptId: "CHEM_ORG_AKCA_001", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Carbonyl Chemistry", subtopic: null, parentConceptId: null, prerequisites: ["CHEM_ORG_GOC_001"] },
  { conceptId: "CHEM_ORG_AKCA_002", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Nucleophilic Addition", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_001", prerequisites: ["CHEM_ORG_AKCA_001"] },
  { conceptId: "CHEM_ORG_AKCA_003", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Enolate Formation", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_001", prerequisites: ["CHEM_ORG_AKCA_001"] },
  { conceptId: "CHEM_ORG_AKCA_004", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Aldol Reaction", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_003", prerequisites: ["CHEM_ORG_AKCA_003", "CHEM_ORG_AKCA_001"] },
  { conceptId: "CHEM_ORG_AKCA_005", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Cross Aldol Reaction", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_004", prerequisites: ["CHEM_ORG_AKCA_004"] },
  { conceptId: "CHEM_ORG_AKCA_006", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Cannizzaro Reaction", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_001", prerequisites: ["CHEM_ORG_AKCA_001"] },
  { conceptId: "CHEM_ORG_AKCA_007", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Haloform Reaction", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_001", prerequisites: ["CHEM_ORG_AKCA_001"] },
  { conceptId: "CHEM_ORG_AKCA_008", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Clemmensen and Wolf-Kishner Reduction", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_001", prerequisites: ["CHEM_ORG_AKCA_001"] },
  { conceptId: "CHEM_ORG_AKCA_009", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Carboxylic Acids", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_001", prerequisites: ["CHEM_ORG_AKCA_001"] },
  { conceptId: "CHEM_ORG_AKCA_010", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Carboxylic Acid Derivatives", subtopic: null, parentConceptId: "CHEM_ORG_AKCA_009", prerequisites: ["CHEM_ORG_AKCA_009"] },

  // ─── AMINES ───────────────────────────────────────────────────────────────
  { conceptId: "CHEM_ORG_AM_001", chapter: "Amines", topic: "Classification of Amines", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_AM_002", chapter: "Amines", topic: "Basicity of Amines", subtopic: null, parentConceptId: "CHEM_ORG_AM_001", prerequisites: ["CHEM_ORG_AM_001", "CHEM_ORG_GOC_002"] },
  { conceptId: "CHEM_ORG_AM_003", chapter: "Amines", topic: "Diazonium Salts", subtopic: null, parentConceptId: "CHEM_ORG_AM_001", prerequisites: ["CHEM_ORG_AM_001"] },
  { conceptId: "CHEM_ORG_AM_004", chapter: "Amines", topic: "Preparation of Amines", subtopic: null, parentConceptId: "CHEM_ORG_AM_001", prerequisites: ["CHEM_ORG_AM_001"] },

  // ─── BIOMOLECULES ─────────────────────────────────────────────────────────
  { conceptId: "CHEM_ORG_BIO_001", chapter: "Biomolecules", topic: "Carbohydrates", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_BIO_002", chapter: "Biomolecules", topic: "Proteins and Amino Acids", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_BIO_003", chapter: "Biomolecules", topic: "Nucleic Acids", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_BIO_004", chapter: "Biomolecules", topic: "Vitamins and Hormones", subtopic: null, parentConceptId: null, prerequisites: [] },

  // ─── POLYMERS ─────────────────────────────────────────────────────────────
  { conceptId: "CHEM_ORG_POL_001", chapter: "Polymers", topic: "Classification of Polymers", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_POL_002", chapter: "Polymers", topic: "Addition and Condensation Polymerisation", subtopic: null, parentConceptId: "CHEM_ORG_POL_001", prerequisites: ["CHEM_ORG_POL_001"] },
  { conceptId: "CHEM_ORG_POL_003", chapter: "Polymers", topic: "Important Commercial Polymers", subtopic: null, parentConceptId: "CHEM_ORG_POL_001", prerequisites: ["CHEM_ORG_POL_001"] },

  // ─── CHEMISTRY IN EVERYDAY LIFE ───────────────────────────────────────────
  { conceptId: "CHEM_ORG_CEL_001", chapter: "Chemistry in Everyday Life", topic: "Drugs and Medicines", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_CEL_002", chapter: "Chemistry in Everyday Life", topic: "Food Chemicals", subtopic: null, parentConceptId: null, prerequisites: [] },
  { conceptId: "CHEM_ORG_CEL_003", chapter: "Chemistry in Everyday Life", topic: "Cleansing Agents", subtopic: null, parentConceptId: null, prerequisites: [] },
];

async function main() {
  console.log("Seeding...");

  // Institute
  const institute = await prisma.institute.upsert({
    where: { contactEmail: "admin@keaplatform.com" },
    update: {},
    create: {
      name: "KEA Institute",
      contactEmail: "admin@keaplatform.com",
    },
  });
  console.log("Institute:", institute.name);

  // Teacher
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@keaplatform.com" },
    update: {},
    create: {
      instituteId: institute.id,
      role: "TEACHER",
      name: "Demo Teacher",
      email: "teacher@keaplatform.com",
      passwordHash: await bcrypt.hash("teacher123", 10),
    },
  });
  console.log("Teacher:", teacher.email);

  // Batch
  const batch = await prisma.batch.upsert({
    where: { id: "seed-batch-001" },
    update: {},
    create: {
      id: "seed-batch-001",
      instituteId: institute.id,
      teacherId: teacher.id,
      name: "Batch A 2025",
      subject: "Chemistry",
      academicYear: "2025-26",
    },
  });
  console.log("Batch:", batch.name);

  // Student
  const student = await prisma.user.upsert({
    where: { email: "student@keaplatform.com" },
    update: {},
    create: {
      instituteId: institute.id,
      batchId: batch.id,
      role: "STUDENT",
      name: "Demo Student",
      email: "student@keaplatform.com",
      passwordHash: await bcrypt.hash("student123", 10),
    },
  });
  console.log("Student:", student.email);

  // ConceptTaxonomy
  for (const concept of ORGANIC_CHEMISTRY_TAXONOMY) {
    await prisma.conceptTaxonomy.upsert({
      where: { conceptId: concept.conceptId },
      update: concept,
      create: { ...concept, subject: "Chemistry" },
    });
  }
  console.log(`Seeded ${ORGANIC_CHEMISTRY_TAXONOMY.length} concepts.`);

  console.log("\nSeed complete.");
  console.log("Login credentials:");
  console.log("  Teacher  → teacher@keaplatform.com / teacher123");
  console.log("  Student  → student@keaplatform.com / student123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
