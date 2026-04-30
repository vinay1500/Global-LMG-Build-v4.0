import React, { useEffect, useMemo, useState } from 'react';
import { Bell, FileStack, FileText, Layers, Loader2, Save, Shield, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../data/seedData';
import type { SettingsWorkspaceResponse, UpdateInvoiceSettingsPayload } from '../lib/api/contracts';

type SettingsTab =
  | 'documents'
  | 'invoice'
  | 'notifications'
  | 'pricing'
  | 'roles'
  | 'services'
  | 'templates';

type SettingsWorkspaceProps = {
  onUpdateInvoiceSettings?: (payload: UpdateInvoiceSettingsPayload) => Promise<void>;
  workspace: SettingsWorkspaceResponse;
};

const ACTIVE_TAB_ORDER: Array<{ id: SettingsTab; label: string }> = [
  { id: 'services', label: 'Service Catalog' },
  { id: 'pricing', label: 'Pricing Rules' },
  { id: 'invoice', label: 'Invoice Settings' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'templates', label: 'Templates' },
  { id: 'documents', label: 'Document Types' },
];

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  onUpdateInvoiceSettings,
  workspace,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('services');
  const invoiceSettings = workspace.invoiceConfiguration.settings;
  const [invoiceForm, setInvoiceForm] = useState({
    billingDisplayName: invoiceSettings.billingDisplayName,
    businessLegalName: invoiceSettings.businessLegalName,
    businessState: invoiceSettings.businessState,
    defaultGstRatePercent: String(invoiceSettings.defaultGstRatePercent),
    defaultSacCode: invoiceSettings.defaultSacCode || '',
    fallbackTaxType: invoiceSettings.fallbackTaxType,
    gstEnabled: invoiceSettings.gstEnabled,
    gstin: invoiceSettings.gstin || '',
    invoiceFooter: invoiceSettings.invoiceFooter || '',
    invoicePrefix: invoiceSettings.invoicePrefix,
    paymentTermsDays: String(invoiceSettings.paymentTermsDays),
    pricesIncludeTax: invoiceSettings.pricesIncludeTax,
    reverseChargeNote: invoiceSettings.reverseChargeNote || '',
    taxMode: invoiceSettings.taxMode,
  });
  const [invoiceSaveError, setInvoiceSaveError] = useState('');
  const [invoiceSaveMessage, setInvoiceSaveMessage] = useState('');
  const [isSavingInvoiceSettings, setIsSavingInvoiceSettings] = useState(false);

  const servicesByDomain = useMemo(() => {
    const groups = new Map<string, SettingsWorkspaceResponse['services']>();

    workspace.services.forEach((service) => {
      const next = groups.get(service.domainName) || [];
      next.push(service);
      groups.set(service.domainName, next);
    });

    return Array.from(groups.entries());
  }, [workspace.services]);

  useEffect(() => {
    setInvoiceForm({
      billingDisplayName: invoiceSettings.billingDisplayName,
      businessLegalName: invoiceSettings.businessLegalName,
      businessState: invoiceSettings.businessState,
      defaultGstRatePercent: String(invoiceSettings.defaultGstRatePercent),
      defaultSacCode: invoiceSettings.defaultSacCode || '',
      fallbackTaxType: invoiceSettings.fallbackTaxType,
      gstEnabled: invoiceSettings.gstEnabled,
      gstin: invoiceSettings.gstin || '',
      invoiceFooter: invoiceSettings.invoiceFooter || '',
      invoicePrefix: invoiceSettings.invoicePrefix,
      paymentTermsDays: String(invoiceSettings.paymentTermsDays),
      pricesIncludeTax: invoiceSettings.pricesIncludeTax,
      reverseChargeNote: invoiceSettings.reverseChargeNote || '',
      taxMode: invoiceSettings.taxMode,
    });
  }, [invoiceSettings]);

  const saveInvoiceSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onUpdateInvoiceSettings) {
      setInvoiceSaveError('Invoice settings editing is not available for this admin session.');
      return;
    }

    const defaultGstRatePercent = Number(invoiceForm.defaultGstRatePercent);
    const paymentTermsDays = Number(invoiceForm.paymentTermsDays);

    if (Number.isNaN(defaultGstRatePercent) || defaultGstRatePercent < 0 || defaultGstRatePercent > 100) {
      setInvoiceSaveError('GST rate must be between 0 and 100.');
      return;
    }

    if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365) {
      setInvoiceSaveError('Payment terms must be a whole number from 0 to 365 days.');
      return;
    }

    setInvoiceSaveError('');
    setInvoiceSaveMessage('');
    setIsSavingInvoiceSettings(true);

    try {
      await onUpdateInvoiceSettings({
        billingDisplayName: invoiceForm.billingDisplayName,
        businessLegalName: invoiceForm.businessLegalName,
        businessState: invoiceForm.businessState,
        defaultGstRatePercent,
        defaultSacCode: invoiceForm.defaultSacCode.trim() || null,
        fallbackTaxType: invoiceForm.fallbackTaxType,
        gstEnabled: invoiceForm.gstEnabled,
        gstin: invoiceForm.gstin.trim() || null,
        invoiceFooter: invoiceForm.invoiceFooter.trim() || null,
        invoicePrefix: invoiceForm.invoicePrefix,
        paymentTermsDays,
        pricesIncludeTax: invoiceForm.pricesIncludeTax,
        reverseChargeNote: invoiceForm.reverseChargeNote.trim() || null,
        taxMode: invoiceForm.taxMode,
      });
      setInvoiceSaveMessage('Invoice settings saved.');
    } catch (error) {
      setInvoiceSaveError(error instanceof Error ? error.message : 'Unable to save invoice settings.');
    } finally {
      setIsSavingInvoiceSettings(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-medium text-[#2C2B29]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Settings
          </h2>
          <p className="text-sm text-[#8C8981] mt-1">
            Shared platform configuration, pricing reference, notification taxonomy, and governed access design.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E6E4DD] bg-white px-4 py-2 text-sm text-[#5A7C96]">
          <Shield className="w-4 h-4 text-[#C19A5B]" />
          Live schema-backed reference
        </div>
      </div>

      <div className="rounded-xl border border-[#E6E4DD] bg-[#FDF8EF] p-4">
        <p className="text-sm text-[#2C2B29]">
          This screen reads directly from shared MySQL configuration. Invoice settings are editable here and apply to newly-created invoices only.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[240px,minmax(0,1fr)] gap-6">
        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-3 space-y-1 h-fit">
          {ACTIVE_TAB_ORDER.map((section) => (
            <button
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                activeTab === section.id
                  ? 'bg-[#2C2B29] text-white'
                  : 'text-[#5A7C96] hover:bg-[#F4F1EA] hover:text-[#2C2B29]'
              }`}
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#E6E4DD] rounded-xl shadow-sm p-6">
          {activeTab === 'services' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Grouped from the shared service catalog and legal-domain mapping."
                icon={Layers}
                title="Service Catalog"
              />
              {servicesByDomain.map(([domainName, services]) => (
                <div key={domainName}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[#2C2B29]">{domainName}</h3>
                    <span className="text-xs text-[#8C8981]">{services.length} services</span>
                  </div>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4"
                        key={service.code}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{service.name}</p>
                            <p className="text-xs text-[#8C8981] mt-1">{service.description || 'No description set.'}</p>
                          </div>
                          <MetaPill label={service.isActive ? 'Active' : 'Inactive'} tone={service.isActive ? 'green' : 'neutral'} />
                        </div>
                        <p className="text-[11px] text-[#A8A69F] mt-3 uppercase tracking-[0.2em]">{service.code}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === 'pricing' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Live slab pricing and urgency surcharge rules used by the quote engine."
                icon={SlidersHorizontal}
                title="Pricing Rules"
              />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Service Slabs</h3>
                  <div className="space-y-3">
                    {workspace.pricingRules.serviceSlabs.map((slab) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={`${slab.effectiveFrom}-${slab.minServiceCount}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">
                              {slab.minServiceCount} to {slab.maxServiceCount ?? '∞'} services
                            </p>
                            <p className="text-xs text-[#8C8981] mt-1">
                              Effective {slab.effectiveFrom}
                              {slab.effectiveTo ? ` to ${slab.effectiveTo}` : ' onwards'}
                            </p>
                          </div>
                          <MetaPill label={slab.isActive ? 'Active' : 'Inactive'} tone={slab.isActive ? 'green' : 'neutral'} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <InfoBlock label="Base Amount" value={formatCurrency(slab.baseAmount)} />
                          <InfoBlock
                            label="Per Extra Service"
                            value={slab.perExtraServiceAmount === null ? '—' : formatCurrency(slab.perExtraServiceAmount)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Urgency Surcharge</h3>
                  <div className="space-y-3">
                    {workspace.pricingRules.urgencyRules.map((rule) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={rule.code}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{rule.label}</p>
                            <p className="text-xs text-[#8C8981] mt-1 uppercase tracking-[0.18em]">{rule.code}</p>
                          </div>
                          <MetaPill label={rule.isActive ? 'Active' : 'Inactive'} tone={rule.isActive ? 'green' : 'neutral'} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <InfoBlock label="Surcharge Type" value={rule.surchargeType} />
                          <InfoBlock label="Surcharge Value" value={String(rule.surchargeValue)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'invoice' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Operational invoice defaults and ledger taxonomy mirrored from billing tables."
                icon={FileText}
                title="Invoice Settings"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <InfoBlock label="Latest Invoice" value={workspace.invoiceConfiguration.latestInvoiceNumber || '—'} />
                <InfoBlock label="Next Invoice" value={workspace.invoiceConfiguration.nextInvoiceNumber || '—'} />
                <InfoBlock
                  label="Default Due Window"
                  value={`${workspace.invoiceConfiguration.defaultManualDueDays} days`}
                />
                <InfoBlock
                  label="Tax Rates"
                  value={String(workspace.invoiceConfiguration.taxRates.length)}
                />
              </div>
              <form
                className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5"
                onSubmit={saveInvoiceSettings}
              >
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#2C2B29]">Editable Invoice Defaults</h3>
                    <p className="mt-1 text-xs text-[#8C8981]">
                      These settings apply only to newly-created invoices. Existing historical invoices keep their stored totals.
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!onUpdateInvoiceSettings || isSavingInvoiceSettings}
                    type="submit"
                  >
                    {isSavingInvoiceSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SettingsInput
                    label="Business Legal Name"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, businessLegalName: value }))}
                    value={invoiceForm.businessLegalName}
                  />
                  <SettingsInput
                    label="Billing Display Name"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, billingDisplayName: value }))}
                    value={invoiceForm.billingDisplayName}
                  />
                  <SettingsInput
                    label="GSTIN"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, gstin: value.toUpperCase() }))}
                    placeholder="Optional"
                    value={invoiceForm.gstin}
                  />
                  <SettingsInput
                    label="Business State"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, businessState: value }))}
                    value={invoiceForm.businessState}
                  />
                  <SettingsInput
                    label="Invoice Prefix"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, invoicePrefix: value }))}
                    value={invoiceForm.invoicePrefix}
                  />
                  <SettingsInput
                    label="Default SAC Code"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, defaultSacCode: value }))}
                    placeholder="Optional"
                    value={invoiceForm.defaultSacCode}
                  />
                  <SettingsInput
                    label="GST Rate (%)"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, defaultGstRatePercent: value }))}
                    type="number"
                    value={invoiceForm.defaultGstRatePercent}
                  />
                  <SettingsInput
                    label="Payment Terms Days"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, paymentTermsDays: value }))}
                    type="number"
                    value={invoiceForm.paymentTermsDays}
                  />
                  <SettingsSelect
                    label="Tax Mode"
                    onChange={(value) =>
                      setInvoiceForm((current) => ({
                        ...current,
                        taxMode: value as typeof invoiceForm.taxMode,
                      }))
                    }
                    options={[
                      { label: 'Forward Charge', value: 'forward_charge' },
                      { label: 'Reverse Charge', value: 'reverse_charge' },
                      { label: 'Exempt', value: 'exempt' },
                    ]}
                    value={invoiceForm.taxMode}
                  />
                  <SettingsSelect
                    label="Unknown-State Fallback"
                    onChange={(value) =>
                      setInvoiceForm((current) => ({
                        ...current,
                        fallbackTaxType: value as typeof invoiceForm.fallbackTaxType,
                      }))
                    }
                    options={[
                      { label: 'IGST', value: 'igst' },
                      { label: 'CGST + SGST', value: 'cgst_sgst' },
                      { label: 'No Tax', value: 'none' },
                    ]}
                    value={invoiceForm.fallbackTaxType}
                  />
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={invoiceForm.gstEnabled}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setInvoiceForm((current) => ({ ...current, gstEnabled: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">GST enabled</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={invoiceForm.pricesIncludeTax}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setInvoiceForm((current) => ({ ...current, pricesIncludeTax: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Prices include tax</span>
                  </label>
                  <SettingsTextArea
                    label="Invoice Footer"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, invoiceFooter: value }))}
                    value={invoiceForm.invoiceFooter}
                  />
                  <SettingsTextArea
                    label="Reverse Charge Note"
                    onChange={(value) => setInvoiceForm((current) => ({ ...current, reverseChargeNote: value }))}
                    value={invoiceForm.reverseChargeNote}
                  />
                </div>

                {invoiceSaveError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {invoiceSaveError}
                  </div>
                ) : null}
                {invoiceSaveMessage ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {invoiceSaveMessage}
                  </div>
                ) : null}
              </form>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Invoice Statuses</h3>
                  <div className="space-y-3">
                    {workspace.invoiceConfiguration.invoiceStatuses.map((status) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 flex items-center justify-between" key={status.code}>
                        <span className="text-sm text-[#2C2B29]">{status.label}</span>
                        <span className="text-xs text-[#8C8981] uppercase tracking-[0.2em]">{status.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Tax Rates</h3>
                  <div className="space-y-3">
                    {workspace.invoiceConfiguration.taxRates.map((taxRate) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={taxRate.code}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{taxRate.name}</p>
                            <p className="text-xs text-[#8C8981] mt-1 uppercase tracking-[0.2em]">{taxRate.code}</p>
                          </div>
                          <MetaPill label={taxRate.isActive ? 'Active' : 'Inactive'} tone={taxRate.isActive ? 'green' : 'neutral'} />
                        </div>
                        <p
                          className="text-2xl mt-4 text-[#2C2B29]"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {taxRate.ratePercent}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'notifications' ? (
            <div className="space-y-6">
              <SectionHeader
                description="In-app notification types and consultation modes currently available in the platform."
                icon={Bell}
                title="Notifications"
              />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Notification Types</h3>
                  <div className="space-y-3">
                    {workspace.notificationTypes.map((type) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3 flex items-center justify-between" key={type.code}>
                        <span className="text-sm text-[#2C2B29]">{type.label}</span>
                        <span className="text-xs text-[#8C8981] uppercase tracking-[0.2em]">{type.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Consultation Modes</h3>
                  <div className="space-y-3">
                    {workspace.consultationModes.map((mode) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={mode.code}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{mode.label}</p>
                            <p className="text-xs text-[#8C8981] mt-1 uppercase tracking-[0.2em]">{mode.code}</p>
                          </div>
                          <MetaPill label={mode.isActive ? 'Active' : 'Inactive'} tone={mode.isActive ? 'green' : 'neutral'} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'roles' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Role and permission topology from the current RBAC workspace."
                icon={Shield}
                title="Roles & Permissions"
              />
              {!workspace.rbac.canManage ? (
                <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-6 text-sm text-[#8C8981]">
                  Your current admin role can view the settings surface, but RBAC detail is restricted to actors with `rbac.manage`.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {workspace.rbac.roles.map((role) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={role.code}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{role.name}</p>
                            <p className="text-xs text-[#8C8981] mt-1">{role.description}</p>
                          </div>
                          <MetaPill label={role.isActive ? 'Active' : 'Inactive'} tone={role.isActive ? 'green' : 'neutral'} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <InfoBlock label="Users" value={String(role.userCount)} />
                          <InfoBlock label="Permissions" value={String(role.permissionCodes.length)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Permission Registry</h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {workspace.rbac.permissions.map((permission) => (
                        <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={permission.code}>
                          <p className="text-sm font-medium text-[#2C2B29]">{permission.description || permission.code}</p>
                          <p className="text-xs text-[#8C8981] mt-1">{permission.moduleName} • {permission.actionName}</p>
                          <p className="text-[11px] text-[#A8A69F] mt-3 uppercase tracking-[0.2em]">{permission.code}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {activeTab === 'templates' ? (
            <div className="space-y-6">
              <SectionHeader
                description="System notification and communication templates currently defined for the platform."
                icon={Layers}
                title="Templates"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspace.templates.map((template) => (
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={template.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">{template.label}</p>
                        <p className="text-[11px] text-[#A8A69F] mt-1 uppercase tracking-[0.2em]">{template.id}</p>
                      </div>
                      <MetaPill
                        label={template.channel}
                        tone={template.channel === 'email' ? 'amber' : 'blue'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === 'documents' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Observed document categories currently in use across live records."
                icon={FileStack}
                title="Document Types"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {workspace.documentCategories.map((category) => (
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={category.code}>
                    <p className="text-sm font-medium text-[#2C2B29]">{category.code}</p>
                    <p className="text-xs text-[#8C8981] mt-1">Used in live document records</p>
                    <p
                      className="text-2xl mt-4 text-[#2C2B29]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {category.usageCount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) => (
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 rounded-xl bg-[#F4F1EA] border border-[#E6E4DD] flex items-center justify-center">
      <Icon className="w-5 h-5 text-[#5A7C96]" />
    </div>
    <div>
      <h3 className="text-lg font-medium text-[#2C2B29]">{title}</h3>
      <p className="text-sm text-[#8C8981] mt-1">{description}</p>
    </div>
  </div>
);

const SettingsInput = ({
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'number' | 'text';
  value: string;
}) => (
  <label className="space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A8A69F]">{label}</span>
    <input
      className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29] outline-none transition focus:border-[#C19A5B]"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  </label>
);

const SettingsSelect = ({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) => (
  <label className="space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A8A69F]">{label}</span>
    <select
      className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29] outline-none transition focus:border-[#C19A5B]"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const SettingsTextArea = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className="space-y-1.5 md:col-span-2">
    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A8A69F]">{label}</span>
    <textarea
      className="min-h-24 w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29] outline-none transition focus:border-[#C19A5B]"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  </label>
);

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] px-4 py-3">
    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A8A69F]">{label}</p>
    <p className="text-sm text-[#2C2B29] mt-2">{value}</p>
  </div>
);

const MetaPill = ({
  label,
  tone,
}: {
  label: string;
  tone: 'amber' | 'blue' | 'green' | 'neutral';
}) => {
  const toneClasses = {
    amber: 'bg-[#FDF8EF] text-[#997A48] border-[#EAD2A8]',
    blue: 'bg-[#EFF3F6] text-[#5A7C96] border-[#D6E4EE]',
    green: 'bg-[#EEF9F1] text-[#2e7d32] border-[#CFE8D5]',
    neutral: 'bg-white text-[#8C8981] border-[#E6E4DD]',
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${toneClasses}`}>
      {label}
    </span>
  );
};
