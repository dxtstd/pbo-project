export const normalizePhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
};

export const isValidPhoneNumber = (value: string): boolean => {
  const normalized = normalizePhoneNumber(value);
  return normalized.length >= 10 && normalized.length <= 15;
};
