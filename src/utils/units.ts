const KG_PER_LB = 0.45359237
const CM_PER_INCH = 2.54

export function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 10) / 10
}

export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 100) / 100
}

export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalInches = Math.round(cm / CM_PER_INCH)
  return { ft: Math.floor(totalInches / 12), in: totalInches % 12 }
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * CM_PER_INCH * 10) / 10
}
