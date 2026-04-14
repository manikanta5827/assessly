-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "estimated_cost" DECIMAL(10,6),
ADD COLUMN     "input_tokens" INTEGER,
ADD COLUMN     "output_tokens" INTEGER,
ADD COLUMN     "total_tokens" INTEGER;
