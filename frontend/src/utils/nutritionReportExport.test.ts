/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EvaluacionAntropometrica, PacienteClinico, PlanNutricional, Tenant } from '../types/index.ts';
import {
  buildNutritionReportPdfOptions,
  getClinicPdfBranding,
  hasNutritionReportData,
} from './nutritionReportExport.ts';

const PATIENT = { id: 'p1', first_name: 'Ana', last_name: 'Pérez' } as PacienteClinico;
const ISAK = { id: 'isak-1' } as EvaluacionAntropometrica;
const WITHINGS = { id: 'bia-1' } as EvaluacionAntropometrica;
const PLAN = { id: 'plan-1' } as PlanNutricional;

describe('getClinicPdfBranding', () => {
  it('usa los datos de la clínica cuando existen', () => {
    const tenant = {
      name: 'Clínica Sur',
      primary_color: '#112233',
      logo_url: 'data:image/png;base64,AAA',
      settings: { address: 'Calle 1', phone: '+56 1', email: 'hola@sur.cl' },
    } as unknown as Tenant;

    assert.deepEqual(getClinicPdfBranding(tenant), {
      clinicName: 'Clínica Sur',
      clinicAddress: 'Calle 1',
      clinicPhone: '+56 1',
      clinicEmail: 'hola@sur.cl',
      clinicLogoBase64: 'data:image/png;base64,AAA',
      primaryColorHex: '#112233',
    });
  });

  it('cae a los valores institucionales por defecto sin tenant', () => {
    const branding = getClinicPdfBranding(null);
    assert.equal(branding.clinicName, 'KineSys Salud & Centro Clínico');
    assert.equal(branding.primaryColorHex, '#004870');
    assert.equal(branding.clinicLogoBase64, undefined);
  });
});

describe('hasNutritionReportData', () => {
  it('es verdadero con cualquiera de los tres bloques', () => {
    assert.equal(hasNutritionReportData({ isak: ISAK }), true);
    assert.equal(hasNutritionReportData({ withings: WITHINGS }), true);
    assert.equal(hasNutritionReportData({ plan: PLAN }), true);
  });

  it('es falso sin datos', () => {
    assert.equal(hasNutritionReportData({}), false);
    assert.equal(hasNutritionReportData({ isak: null, withings: null, plan: null }), false);
  });
});

describe('buildNutritionReportPdfOptions', () => {
  it('combina paciente, nutricionista, branding y los tres bloques', () => {
    const options = buildNutritionReportPdfOptions({
      patient: PATIENT,
      nutritionistName: 'Lic. Prueba',
      tenant: null,
      data: { isak: ISAK, withings: WITHINGS, plan: PLAN },
    });

    assert.equal(options.patient, PATIENT);
    assert.equal(options.nutritionistName, 'Lic. Prueba');
    assert.equal(options.isak, ISAK);
    assert.equal(options.withings, WITHINGS);
    assert.equal(options.plan, PLAN);
    assert.equal(options.clinicName, 'KineSys Salud & Centro Clínico');
  });

  it('normaliza los bloques ausentes a null', () => {
    const options = buildNutritionReportPdfOptions({
      patient: PATIENT,
      nutritionistName: 'Lic. Prueba',
      tenant: null,
      data: { isak: ISAK },
    });
    assert.equal(options.withings, null);
    assert.equal(options.plan, null);
  });
});
