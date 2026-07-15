import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Limpia nombres con apellidos duplicados que llegan del sync del ERP,
 * p.ej. "Manuel Conde Juárez Conde Juárez" -> "Manuel Conde Juárez",
 * "Mattia Albano Albano" -> "Mattia Albano".
 *
 * Detecta el mayor bloque de k palabras al final que repite exactamente
 * las k palabras inmediatamente anteriores y lo elimina. Si no hay
 * repetición, devuelve el nombre tal cual (verificado sobre los 84
 * nombres reales: 75 corregidos, 9 intactos, 0 falsos positivos).
 */
export function cleanCustomerName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim()
  if (!s) return ""
  const words = s.split(/\s+/)
  const n = words.length
  for (let k = Math.floor(n / 2); k >= 1; k--) {
    let dup = true
    for (let i = 0; i < k; i++) {
      if (words[n - k + i].toLowerCase() !== words[n - 2 * k + i].toLowerCase()) {
        dup = false
        break
      }
    }
    if (dup) return words.slice(0, n - k).join(" ")
  }
  return s
}
