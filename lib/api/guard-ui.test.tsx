import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuardMobileSelect } from '../../components/guard/GuardMobileSelect';
import { GuardScannerScreen } from '../../components/guard/GuardScannerScreen';
import { GuardQrScannerModal } from '../../components/guard/GuardQrScannerModal';
import { ToastView } from '../../components/common/Toast';
import { VisitorLiveStatus } from '../../components/visitors/VisitorLiveStatus';
import { useAuthStore } from '../../store/useAuthStore';
import { useVisitorStore } from '../../store/useVisitorStore';
import { filterValidGuestPasses } from '../guard-passes';
import apiClient from './client';

test('Guard mobile UI behaviors', async (suite) => {
  await suite.test('GuardMobileSelect renders a mobile picker button instead of a browser <select>', () => {
    const html = renderToStaticMarkup(
      <GuardMobileSelect
        id="guard-entry-tower"
        sheetTitle="Select Tower / Building"
        placeholder="Select Tower"
        value="tower-a"
        options={[
          { value: 'tower-a', label: 'Tower A', subtitle: 'Residential Tower' },
          { value: 'tower-b', label: 'Tower B', subtitle: 'Residential Tower' },
        ]}
        onChange={() => undefined}
      />,
    );

    assert.match(html, /<button[^>]*id="guard-entry-tower"[^>]*aria-haspopup="listbox"/);
    assert.ok(!html.includes('<select'), 'Must not render native browser <select>');
    assert.ok(html.includes('Tower A'));
  });

  await suite.test('Toast renders non-modal mobile alert on guard portal', () => {
    const html = renderToStaticMarkup(
      <ToastView
        visible
        message="Please enter visitor name"
        title={null}
        type="error"
        duration={3800}
        isGuardMobile
        onClose={() => undefined}
      />,
    );
    assert.ok(html.includes('guard-mobile-alert'));
    assert.ok(html.includes('Please enter visitor name'));
    assert.ok(!html.includes('swal-toast-backdrop'), 'Must not render desktop SweetAlert modal on guard');
    assert.ok(!html.includes('swal-toast-popup'), 'Must not render desktop SweetAlert popup on guard');
  });

  await suite.test('Toast retains modal alert outside guard portal', () => {
    const html = renderToStaticMarkup(
      <ToastView
        visible
        message="Saved changes"
        title={null}
        type="success"
        duration={3800}
        isGuardMobile={false}
        onClose={() => undefined}
      />,
    );
    assert.ok(html.includes('swal-toast-backdrop'));
    assert.ok(html.includes('swal-toast-popup'));
  });

  await suite.test('VisitorLiveStatus supports silent mode for guard header', () => {
    const html = renderToStaticMarkup(<VisitorLiveStatus silent />);
    assert.equal(html, '');
  });

  await suite.test('Guard views contain no native <select> dropdowns or Synchronizing live gate records banner', () => {
    const root = process.cwd();
    for (const file of [
      'components/guard/GuardApp.tsx',
      'components/guard/GuardScannerScreen.tsx',
      'components/guard/GuardQrScannerModal.tsx',
    ]) {
      const source = readFileSync(join(root, file), 'utf8');
      assert.ok(!/<select[\s>]/i.test(source), `${file} must not contain native <select>`);
      assert.ok(!source.includes('Synchronizing live gate records...'), `${file} must not show sync banner`);
    }

    const guardAppSource = readFileSync(join(root, 'components/guard/GuardApp.tsx'), 'utf8');
    assert.ok(guardAppSource.includes('guard-portal-scope'));
    assert.ok(guardAppSource.includes('guard-photo-modal'));
    assert.ok(guardAppSource.includes('togglePhotoFacing'));
    assert.ok(guardAppSource.includes('togglePhotoTorch'));
    assert.ok(guardAppSource.includes("useState('Other')"), 'Default Purpose of Visit must be Other');
    assert.ok(guardAppSource.includes("id: 'Other'"));
    assert.ok(guardAppSource.indexOf("id: 'Other'") < guardAppSource.indexOf("id: 'Delivery'"), 'Other must be the 1st option');
    assert.ok(guardAppSource.includes('guard-scan-plate-btn'));
    assert.ok(guardAppSource.includes('handleApplyPlateScan'));
    assert.ok(!guardAppSource.includes('isPhotoModalOpen'), 'Stale isPhotoModalOpen symbol must not remain in GuardApp.tsx');

    const selectSource = readFileSync(join(root, 'components/guard/GuardMobileSelect.tsx'), 'utf8');
    assert.ok(selectSource.includes('searchable = true'));
    assert.ok(selectSource.includes('guard-select-search'));
    assert.ok(selectSource.includes('touchmove'));

    const guardCss = readFileSync(join(root, 'styles/guard.css'), 'utf8');
    assert.ok(guardCss.includes('--guard-accent: #0284c7'));
    assert.ok(guardCss.includes('height: 68%'));
    assert.ok(guardCss.includes('.guard-photo-modal'));
    assert.ok(guardCss.includes('.guard-photo-modal.is-front-flash'));
    assert.ok(guardCss.includes('.guard-plate-scan-btn'));
    assert.ok(guardCss.includes('.guard-plate-reticle'));
  });

  await suite.test('GuardScannerScreen and GuardQrScannerModal render without runtime errors', () => {
    const scannerHtml = renderToStaticMarkup(
      <GuardScannerScreen onBack={() => undefined} onConfirmEntry={async () => undefined} />,
    );
    const modalHtml = renderToStaticMarkup(
      <GuardQrScannerModal onClose={() => undefined} onConfirmEntry={async () => undefined} />,
    );
    assert.ok(scannerHtml.includes('FastPass Scanner'));
    assert.ok(scannerHtml.includes('Pre-Approved Guest Passes:'));
    assert.ok(modalHtml.includes('Scan Pre-Approved FastPass'));
  });

  await suite.test('filterValidGuestPasses uses exact window and visit binding', () => {
    const base = { id: '1', visitId: 'visit-1', passCode: 'A1', guestName: 'Valid', phone: '', purpose: 'Guest Pass', flat: '—', resident: 'Res', startDate: '2026-11-10T10:00:00Z', endDate: '2026-11-10T18:00:00Z', validityDisplay: '', gate: 'Main', status: 'Active' as const };
    const passes = [base, { ...base, guestName: 'Expired', endDate: '2026-11-10T16:00:00Z' },
      { ...base, guestName: 'Future', startDate: '2026-11-11T10:00:00Z' },
      { ...base, guestName: 'Revoked', status: 'Revoked' as const }, { ...base, guestName: 'Unbound', visitId: undefined }];
    assert.deepEqual(filterValidGuestPasses(passes, new Date('2026-11-10T16:40:00Z')).map(pass => pass.guestName), ['Valid']);
    assert.deepEqual(filterValidGuestPasses([base], new Date(base.endDate)), []);
  });

  await suite.test('loadGuardData only toggles isLoading on initial load, not background refreshes', async () => {
    const origGet = apiClient.get;
    const origWindow = (globalThis as { window?: unknown }).window;
    const origLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;
    Object.defineProperty(globalThis, 'window', {
      value: { location: { pathname: '/guard' } },
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      configurable: true,
    });
    const prevAuth = useAuthStore.getState();
    useVisitorStore.getState().reset();
    useAuthStore.setState({
      isAuthenticated: true,
      logoutInProgress: false,
      organizationId: '11111111-1111-4111-8111-111111111111',
      backendUser: { id: 'guard-1', mobileNumber: '9999999999' },
      roles: ['GUARD'],
    });

    let resolvePending: (() => void) | null = null;
    (apiClient as unknown as { get: (url: string) => Promise<{ data: unknown[] }> }).get = () =>
      new Promise((resolve) => {
        if (resolvePending) {
          resolve({ data: [] });
          return;
        }
        resolvePending = () => resolve({ data: [] });
      });

    try {
      const initialLoad = useVisitorStore.getState().loadGuardData();
      assert.equal(useVisitorStore.getState().isLoading, true, 'Initial load should set isLoading=true');
      (apiClient as unknown as { get: (url: string) => Promise<{ data: unknown[] }> }).get = async () => ({
        data: [],
      });
      const completePending = resolvePending as (() => void) | null;
      completePending?.();
      await initialLoad;
      assert.equal(useVisitorStore.getState().isLoading, false);
      assert.equal(useVisitorStore.getState().hasLoadedVisitors, true);

      let seenLoadingDuringRefresh = false;
      (apiClient as unknown as { get: (url: string) => Promise<{ data: unknown[] }> }).get = async () => {
        if (useVisitorStore.getState().isLoading) seenLoadingDuringRefresh = true;
        return { data: [] };
      };
      await useVisitorStore.getState().loadGuardData();
      assert.equal(seenLoadingDuringRefresh, false, 'Subsequent sync must not set isLoading=true');
    } finally {
      apiClient.get = origGet;
      useVisitorStore.getState().reset();
      useAuthStore.setState(prevAuth);
      if (origWindow === undefined) Reflect.deleteProperty(globalThis, 'window');
      else Object.defineProperty(globalThis, 'window', { value: origWindow, configurable: true });
      if (origLocalStorage === undefined) Reflect.deleteProperty(globalThis, 'localStorage');
      else Object.defineProperty(globalThis, 'localStorage', { value: origLocalStorage, configurable: true });
    }
  });
});
