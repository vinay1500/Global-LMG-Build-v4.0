import { describe, expect, it } from 'vitest';
import {
  allowedConsultationModesForUrgency,
  buildPriceOverrideMap,
  calculateRequestPricingTotal,
  formatUrgencyTiming,
  isUrgencyAllowedForConsultationMode,
  resolveFlatPrice,
  resolvePricingCurrency,
  type ConsultationModePricingRow,
  type CountryPriceOverrideRow,
  type CountryPricingRow,
  type UrgencyPricingRow,
} from '../../backend/src/modules/dashboard/normalizedRepository.js';

const countryPricing = {
  country_code: 'US',
  country_name: 'United States',
  currency_code: 'USD',
  id: 1,
  price_multiplier: '1.25',
  public_id: 'country-in',
} as CountryPricingRow;

const override = (input: Partial<CountryPriceOverrideRow>): CountryPriceOverrideRow =>
  ({
    country_code: 'US',
    country_name: 'United States',
    currency_code: 'USD',
    price_amount: '250.00',
    subject_code: 'coordination',
    subject_type_code: 'service',
    ...input,
  }) as CountryPriceOverrideRow;

const urgency = (input: Partial<UrgencyPricingRow> = {}): UrgencyPricingRow =>
  ({
    allow_in_person: 0,
    allow_phone: 1,
    allow_video: 1,
    id: 1,
    label: 'Standard',
    max_response_hours: 48,
    min_response_hours: 24,
    response_window_hours: 48,
    surcharge_type_code: 'flat',
    surcharge_value: '0.00',
    timing_label: null,
    urgency_code: 'standard',
    ...input,
  }) as UrgencyPricingRow;

const modes = [
  { code: 'phone' },
  { code: 'video' },
  { code: 'in-person' },
] as ConsultationModePricingRow[];

describe('request pricing calculation', () => {
  it('uses exact country overrides before multipliers', () => {
    const overrides = buildPriceOverrideMap([
      override({ price_amount: '399.00', subject_code: 'coordination' }),
    ]);

    expect(resolveFlatPrice(overrides, 'service', 'coordination', 100, 1.25)).toBe(399);
    expect(resolveFlatPrice(overrides, 'service', 'other-service', 100, 1.25)).toBe(125);
  });

  it('resolves currency from exact country overrides when they are consistent', () => {
    expect(resolvePricingCurrency(countryPricing, [override({ currency_code: 'USD' })])).toBe('USD');
    expect(
      resolvePricingCurrency(countryPricing, [
        override({ currency_code: 'USD' }),
        override({ currency_code: 'AUD', subject_code: 'phone', subject_type_code: 'consultation_mode' }),
      ])
    ).toBe('USD');
  });

  it('calculates service, consultation, urgency, and total fees authoritatively', () => {
    expect(
      calculateRequestPricingTotal({
        consultationFee: 75,
        serviceLineAmounts: [250, 125.5],
        urgencyHasExactOverride: false,
        urgencySurchargeType: 'percent',
        urgencySurchargeValue: 10,
      })
    ).toEqual({
      consultationFee: 75,
      serviceTotal: 375.5,
      total: 488.05,
      urgencyFee: 37.55,
    });
  });

  it('enforces consultation-mode urgency eligibility and editable timing labels', () => {
    const immediate = urgency({
      allow_in_person: 0,
      label: 'Immediate',
      max_response_hours: 6,
      min_response_hours: 2,
      timing_label: '2-6 business hours',
      urgency_code: 'immediate',
    });

    expect(isUrgencyAllowedForConsultationMode(immediate, 'in-person')).toBe(false);
    expect(allowedConsultationModesForUrgency(immediate, modes)).toEqual(['phone', 'video']);
    expect(formatUrgencyTiming(immediate)).toBe('2-6 business hours');
  });
});
