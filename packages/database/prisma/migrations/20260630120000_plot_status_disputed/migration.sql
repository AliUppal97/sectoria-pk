-- Add DISPUTED to the plot lifecycle enum for admin dispute tracking.
ALTER TYPE "PlotStatus" ADD VALUE 'DISPUTED';
