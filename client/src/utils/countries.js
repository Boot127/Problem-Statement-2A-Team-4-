// The 10 priority countries plus second-priority countries (HLD Section 1)

export const COUNTRIES = [
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
];

export function countryName(code) {
  return COUNTRIES.find((c) => c.code === code)?.name || code;
}
