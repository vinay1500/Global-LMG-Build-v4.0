import React, { useEffect, useMemo, useState } from 'react';
import { Bell, FileStack, FileText, Layers, Loader2, Save, Shield, SlidersHorizontal, Users } from 'lucide-react';
import { formatCurrency } from '../data/seedData';
import type {
  CreateRbacRolePayload,
  CreateServiceCatalogPayload,
  ConsultationModePayload,
  CountryPricingPayload,
  DocumentTypePayload,
  NotificationDeliverySettingPayload,
  ReminderSettingPayload,
  PlatformSetting,
  PricingSlabPayload,
  SettingsWorkspaceResponse,
  TeamMemberPayload,
  TeamMemberType,
  TemplatePayload,
  TemplateType,
  UpdateDocumentTypePayload,
  UpdateConsultationModePayload,
  UpdateCountryPricingPayload,
  UpdateInvoiceSettingsPayload,
  UpdateReminderSettingPayload,
  UpdatePlatformSettingPayload,
  UpdateRbacRolePayload,
  UpdateRbacRolePermissionsPayload,
  UpdateServiceCatalogPayload,
  UpdateTeamMemberPayload,
  UpdateTemplatePayload,
  UpdateUrgencyRulePayload,
  UrgencyRulePayload,
} from '../lib/api/contracts';

type SettingsTab =
  | 'documents'
  | 'general'
  | 'invoice'
  | 'notifications'
  | 'pricing'
  | 'roles'
  | 'services'
  | 'team'
  | 'templates';

type SettingsWorkspaceProps = {
  onArchiveDocumentType?: (documentTypeId: string) => Promise<void>;
  onArchivePricingSlab?: (slabId: string) => Promise<void>;
  onArchiveConsultationMode?: (modeCode: string) => Promise<void>;
  onArchiveCountryPricing?: (countryPricingId: string) => Promise<void>;
  onArchiveReminderSetting?: (settingId: string) => Promise<void>;
  onArchiveService?: (serviceId: string) => Promise<void>;
  onArchiveTemplate?: (templateId: string) => Promise<void>;
  onArchiveTeamMember?: (memberId: string) => Promise<void>;
  onArchiveUrgencyRule?: (ruleId: string) => Promise<void>;
  onCreateDocumentType?: (payload: DocumentTypePayload) => Promise<void>;
  onCreatePricingSlab?: (payload: PricingSlabPayload) => Promise<void>;
  onCreateConsultationMode?: (payload: ConsultationModePayload) => Promise<void>;
  onCreateCountryPricing?: (payload: CountryPricingPayload) => Promise<void>;
  onCreateRbacRole?: (payload: CreateRbacRolePayload) => Promise<void>;
  onCreateReminderSetting?: (payload: ReminderSettingPayload) => Promise<void>;
  onCreateService?: (payload: CreateServiceCatalogPayload) => Promise<void>;
  onCreateTemplate?: (payload: TemplatePayload) => Promise<void>;
  onCreateTeamMember?: (payload: TeamMemberPayload) => Promise<void>;
  onCreateUrgencyRule?: (payload: UrgencyRulePayload) => Promise<void>;
  onSetDefaultTemplate?: (templateId: string) => Promise<void>;
  onArchiveRbacRole?: (roleId: string) => Promise<void>;
  onAssignRbacUserRole?: (userId: string, roleCode: string) => Promise<void>;
  onRemoveRbacUserRole?: (userId: string, roleCode: string) => Promise<void>;
  onUpdateDocumentType?: (documentTypeId: string, payload: UpdateDocumentTypePayload) => Promise<void>;
  onUpdateNotificationTypeSetting?: (
    typeCode: string,
    payload: NotificationDeliverySettingPayload
  ) => Promise<void>;
  onUpdatePricingSlab?: (slabId: string, payload: Partial<PricingSlabPayload>) => Promise<void>;
  onUpdateConsultationMode?: (modeCode: string, payload: UpdateConsultationModePayload) => Promise<void>;
  onUpdateCountryPricing?: (countryPricingId: string, payload: UpdateCountryPricingPayload) => Promise<void>;
  onUpdateReminderSetting?: (settingId: string, payload: UpdateReminderSettingPayload) => Promise<void>;
  onUpdateService?: (serviceId: string, payload: UpdateServiceCatalogPayload) => Promise<void>;
  onUpdateTeamMember?: (memberId: string, payload: UpdateTeamMemberPayload) => Promise<void>;
  onUpdateTemplate?: (templateId: string, payload: UpdateTemplatePayload) => Promise<void>;
  onUpdateUrgencyRule?: (ruleId: string, payload: UpdateUrgencyRulePayload) => Promise<void>;
  onUpdateInvoiceSettings?: (payload: UpdateInvoiceSettingsPayload) => Promise<void>;
  onUpdatePlatformSetting?: (key: string, payload: UpdatePlatformSettingPayload) => Promise<void>;
  onUpdateRbacRole?: (roleId: string, payload: UpdateRbacRolePayload) => Promise<void>;
  onUpdateRbacRolePermissions?: (
    roleId: string,
    payload: UpdateRbacRolePermissionsPayload
  ) => Promise<void>;
  workspace: SettingsWorkspaceResponse;
};

const ACTIVE_TAB_ORDER: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General Platform' },
  { id: 'team', label: 'Team & Counsel' },
  { id: 'services', label: 'Service Catalog' },
  { id: 'pricing', label: 'Pricing Rules' },
  { id: 'invoice', label: 'Invoice Settings' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'templates', label: 'Templates' },
  { id: 'documents', label: 'Document Types' },
];

type GeneralPlatformForm = {
  defaultCurrency: string;
  defaultDateFormat: string;
  defaultTimezone: string;
  displayName: string;
  maintenanceBannerEnabled: boolean;
  maintenanceBannerMessage: string;
  operationalFooterNote: string;
  supportEmail: string;
  supportPhone: string;
};

type ServiceFormState = {
  baseFee: string;
  code: string;
  description: string;
  domainCode: string;
  icon: string;
  isActive: boolean;
  name: string;
  sortOrder: string;
};

type PricingSlabFormState = {
  baseAmount: string;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
  maxServiceCount: string;
  minServiceCount: string;
  perExtraServiceAmount: string;
};

type UrgencyRuleFormState = {
  code: string;
  isActive: boolean;
  label: string;
  responseWindowHours: string;
  sortOrder: string;
  surchargeType: 'flat' | 'percent';
  surchargeValue: string;
};

type ConsultationModeFormState = {
  code: string;
  description: string;
  isActive: boolean;
  label: string;
  sortOrder: string;
  surchargeValue: string;
  transportDisclaimer: string;
};

type CountryPricingFormState = {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  isActive: boolean;
  isDefault: boolean;
  multiplier: string;
};

type TemplateFormState = {
  body: string;
  isActive: boolean;
  name: string;
  subject: string;
  type: TemplateType;
  variables: string;
};

type DocumentTypeFormState = {
  allowedExtensions: string;
  category: string;
  clientVisibleDefault: boolean;
  code: string;
  description: string;
  displayOrder: string;
  isActive: boolean;
  maxSizeMb: string;
  name: string;
  requiresReview: boolean;
};

type ReminderFormState = {
  channelCode: 'email' | 'in_app' | 'sms';
  eventTypeCode: string;
  isActive: boolean;
  offsetMinutes: string;
};

type RbacRoleFormState = {
  code: string;
  description: string;
  isActive: boolean;
  name: string;
};

type TeamMemberFormState = {
  active: boolean;
  city: string;
  country: string;
  email: string;
  name: string;
  phone: string;
  specialization: string;
  state: string;
  type: TeamMemberType;
};

const GENERAL_PLATFORM_KEYS = {
  defaultCurrency: 'platform.default_currency',
  defaultDateFormat: 'platform.default_date_format',
  defaultTimezone: 'platform.default_timezone',
  displayName: 'platform.display_name',
  maintenanceBannerEnabled: 'portal.maintenance_banner_enabled',
  maintenanceBannerMessage: 'portal.maintenance_banner_message',
  operationalFooterNote: 'platform.operational_footer_note',
  supportEmail: 'platform.support_email',
  supportPhone: 'platform.support_phone',
} as const;

const settingStringValue = (setting: PlatformSetting | undefined, fallback = '') =>
  typeof setting?.value === 'string' ? setting.value : fallback;

const settingBooleanValue = (setting: PlatformSetting | undefined, fallback = false) =>
  typeof setting?.value === 'boolean' ? setting.value : fallback;

const buildGeneralPlatformForm = (settings: PlatformSetting[]): GeneralPlatformForm => {
  const byKey = new Map(settings.map((setting) => [setting.key, setting]));

  return {
    defaultCurrency: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.defaultCurrency), 'INR'),
    defaultDateFormat: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.defaultDateFormat), 'DD/MM/YYYY'),
    defaultTimezone: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.defaultTimezone), 'Asia/Kolkata'),
    displayName: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.displayName), 'Global LMG'),
    maintenanceBannerEnabled: settingBooleanValue(
      byKey.get(GENERAL_PLATFORM_KEYS.maintenanceBannerEnabled),
      false
    ),
    maintenanceBannerMessage: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.maintenanceBannerMessage)),
    operationalFooterNote: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.operationalFooterNote)),
    supportEmail: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.supportEmail)),
    supportPhone: settingStringValue(byKey.get(GENERAL_PLATFORM_KEYS.supportPhone)),
  };
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const TEMPLATE_SAMPLE_VALUES: Record<string, string> = {
  actionUrl: 'https://portal.globallmg.local',
  adminName: 'Global LMG Support',
  amountDue: '₹10,000',
  clientName: 'Aarav Sharma',
  deadline: '15 May 2026',
  documentType: 'Matter Background',
  dueDate: '15 May 2026',
  footerNote: 'Global LMG is not a law firm and does not provide legal representation.',
  invoiceNumber: 'INV-2026-001',
  matterTitle: 'Property Documentation Support',
  platformName: 'Global LMG',
  supportEmail: 'support@globallmg.local',
  supportPhone: '+91 00000 00000',
  totalAmount: '₹11,800',
};

const TEMPLATE_TYPE_OPTIONS: Array<{ label: string; value: TemplateType }> = [
  { label: 'Invoice Copy', value: 'invoice' },
  { label: 'Message Quick Reply', value: 'message' },
  { label: 'Notification Copy', value: 'notification' },
  { label: 'Document Checklist', value: 'document_checklist' },
  { label: 'General', value: 'general' },
];

const renderTemplatePreview = (value: string) =>
  value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variable: string) => {
    return TEMPLATE_SAMPLE_VALUES[variable] || `[${variable}]`;
  });

const formatTemplateType = (type: TemplateType) =>
  TEMPLATE_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;

const parseCommaSeparatedValues = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatReminderOffset = (minutes: number) => {
  if (minutes % 1440 === 0) {
    return `${minutes / 1440} day${minutes === 1440 ? '' : 's'} before`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} hour${minutes === 60 ? '' : 's'} before`;
  }

  return `${minutes} minutes before`;
};

const TEAM_MEMBER_TYPE_OPTIONS: Array<{ label: string; value: TeamMemberType }> = [
  { label: 'Internal coordination staff', value: 'internal_staff' },
  { label: 'External counsel contact', value: 'external_counsel' },
  { label: 'Field partner', value: 'field_partner' },
];

const formatTeamMemberType = (type: TeamMemberType) =>
  TEAM_MEMBER_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  onArchiveDocumentType,
  onArchivePricingSlab,
  onArchiveReminderSetting,
  onArchiveService,
  onArchiveTeamMember,
  onArchiveTemplate,
  onArchiveUrgencyRule,
  onCreateDocumentType,
  onCreatePricingSlab,
  onCreateRbacRole,
  onCreateReminderSetting,
  onCreateService,
  onCreateTeamMember,
  onCreateTemplate,
  onCreateUrgencyRule,
  onSetDefaultTemplate,
  onArchiveRbacRole,
  onAssignRbacUserRole,
  onRemoveRbacUserRole,
  onUpdateDocumentType,
  onUpdateNotificationTypeSetting,
  onUpdatePricingSlab,
  onUpdateReminderSetting,
  onUpdateService,
  onUpdateTeamMember,
  onUpdateTemplate,
  onUpdateUrgencyRule,
  onUpdateInvoiceSettings,
  onUpdatePlatformSetting,
  onUpdateRbacRole,
  onUpdateRbacRolePermissions,
  workspace,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const invoiceSettings = workspace.invoiceConfiguration.settings;
  const platformSettingsByKey = useMemo(
    () => new Map(workspace.platformSettings.map((setting) => [setting.key, setting])),
    [workspace.platformSettings]
  );
  const [generalForm, setGeneralForm] = useState(() => buildGeneralPlatformForm(workspace.platformSettings));
  const [generalSaveError, setGeneralSaveError] = useState('');
  const [generalSaveMessage, setGeneralSaveMessage] = useState('');
  const [isSavingGeneralSettings, setIsSavingGeneralSettings] = useState(false);
  const [editingTeamMemberId, setEditingTeamMemberId] = useState<string | null>(null);
  const [teamMemberForm, setTeamMemberForm] = useState<TeamMemberFormState>({
    active: true,
    city: '',
    country: 'IN',
    email: '',
    name: '',
    phone: '',
    specialization: '',
    state: '',
    type: 'external_counsel',
  });
  const [teamRegistryMessage, setTeamRegistryMessage] = useState('');
  const [teamRegistryError, setTeamRegistryError] = useState('');
  const [isSavingTeamMember, setIsSavingTeamMember] = useState(false);
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
  const firstDomainCode = workspace.serviceDomains.find((domain) => domain.isActive)?.code || workspace.serviceDomains[0]?.code || '';
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>({
    baseFee: '1000',
    code: '',
    description: '',
    domainCode: firstDomainCode,
    icon: 'Briefcase',
    isActive: true,
    name: '',
    sortOrder: '0',
  });
  const [serviceMessage, setServiceMessage] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [slabForm, setSlabForm] = useState<PricingSlabFormState>({
    baseAmount: '0',
    effectiveFrom: todayDate(),
    effectiveTo: '',
    isActive: true,
    maxServiceCount: '',
    minServiceCount: '1',
    perExtraServiceAmount: '',
  });
  const [editingUrgencyId, setEditingUrgencyId] = useState<string | null>(null);
  const [urgencyForm, setUrgencyForm] = useState<UrgencyRuleFormState>({
    code: '',
    isActive: true,
    label: '',
    responseWindowHours: '',
    sortOrder: '0',
    surchargeType: 'flat',
    surchargeValue: '0',
  });
  const [editingConsultationModeCode, setEditingConsultationModeCode] = useState<string | null>(null);
  const [consultationModeForm, setConsultationModeForm] = useState<ConsultationModeFormState>({
    code: '',
    description: '',
    isActive: true,
    label: '',
    sortOrder: '0',
    surchargeValue: '0',
    transportDisclaimer: '',
  });
  const [editingCountryPricingId, setEditingCountryPricingId] = useState<string | null>(null);
  const [countryPricingForm, setCountryPricingForm] = useState<CountryPricingFormState>({
    countryCode: '',
    countryName: '',
    currencyCode: 'INR',
    isActive: true,
    isDefault: false,
    multiplier: '1',
  });
  const [pricingMessage, setPricingMessage] = useState('');
  const [pricingError, setPricingError] = useState('');
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>({
    body: '',
    isActive: true,
    name: '',
    subject: '',
    type: 'message',
    variables: '',
  });
  const [templateMessage, setTemplateMessage] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [editingDocumentTypeId, setEditingDocumentTypeId] = useState<string | null>(null);
  const [documentTypeForm, setDocumentTypeForm] = useState<DocumentTypeFormState>({
    allowedExtensions: 'pdf,jpg,jpeg,png,doc,docx',
    category: 'general',
    clientVisibleDefault: false,
    code: '',
    description: '',
    displayOrder: '100',
    isActive: true,
    maxSizeMb: '25',
    name: '',
    requiresReview: true,
  });
  const [documentTypeMessage, setDocumentTypeMessage] = useState('');
  const [documentTypeError, setDocumentTypeError] = useState('');
  const [isSavingDocumentType, setIsSavingDocumentType] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationError, setNotificationError] = useState('');
  const [savingNotificationType, setSavingNotificationType] = useState<string | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderForm, setReminderForm] = useState<ReminderFormState>({
    channelCode: 'in_app',
    eventTypeCode: '',
    isActive: true,
    offsetMinutes: '60',
  });
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const firstRoleCode = workspace.rbac.roles[0]?.code || '';
  const [selectedRoleCode, setSelectedRoleCode] = useState(firstRoleCode);
  const [editingRbacRoleCode, setEditingRbacRoleCode] = useState<string | null>(null);
  const [rbacRoleForm, setRbacRoleForm] = useState<RbacRoleFormState>({
    code: '',
    description: '',
    isActive: true,
    name: '',
  });
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<string[]>([]);
  const [rbacUserId, setRbacUserId] = useState(workspace.rbac.users[0]?.id || '');
  const [rbacUserRoleCode, setRbacUserRoleCode] = useState(
    workspace.rbac.roles.find((role) => role.isActive && role.code !== 'client')?.code || ''
  );
  const [rbacMessage, setRbacMessage] = useState('');
  const [rbacError, setRbacError] = useState('');
  const [isSavingRbac, setIsSavingRbac] = useState(false);

  const servicesByDomain = useMemo(() => {
    const groups = new Map<string, SettingsWorkspaceResponse['services']>();

    workspace.services.forEach((service) => {
      const next = groups.get(service.domainName) || [];
      next.push(service);
      groups.set(service.domainName, next);
    });

    return Array.from(groups.entries());
  }, [workspace.services]);

  const selectedRole = useMemo(
    () => workspace.rbac.roles.find((role) => role.code === selectedRoleCode) || workspace.rbac.roles[0],
    [selectedRoleCode, workspace.rbac.roles]
  );

  const activeAssignableRoles = useMemo(
    () => workspace.rbac.roles.filter((role) => role.isActive && role.code !== 'client'),
    [workspace.rbac.roles]
  );

  const permissionsByModule = useMemo(() => {
    const groups = new Map<string, SettingsWorkspaceResponse['rbac']['permissions']>();

    workspace.rbac.permissions.forEach((permission) => {
      const next = groups.get(permission.moduleName) || [];
      next.push(permission);
      groups.set(permission.moduleName, next);
    });

    return Array.from(groups.entries());
  }, [workspace.rbac.permissions]);

  useEffect(() => {
    setGeneralForm(buildGeneralPlatformForm(workspace.platformSettings));
  }, [workspace.platformSettings]);

  useEffect(() => {
    if (!workspace.rbac.roles.some((role) => role.code === selectedRoleCode)) {
      setSelectedRoleCode(workspace.rbac.roles[0]?.code || '');
    }
  }, [selectedRoleCode, workspace.rbac.roles]);

  useEffect(() => {
    if (!workspace.rbac.users.some((user) => user.id === rbacUserId)) {
      setRbacUserId(workspace.rbac.users[0]?.id || '');
    }
  }, [rbacUserId, workspace.rbac.users]);

  useEffect(() => {
    if (!activeAssignableRoles.some((role) => role.code === rbacUserRoleCode)) {
      setRbacUserRoleCode(activeAssignableRoles[0]?.code || '');
    }
  }, [activeAssignableRoles, rbacUserRoleCode]);

  useEffect(() => {
    if (!selectedRole) {
      setSelectedPermissionCodes([]);
      return;
    }

    setSelectedPermissionCodes(selectedRole.permissionCodes);
    if (editingRbacRoleCode === selectedRole.code) {
      setRbacRoleForm({
        code: selectedRole.code,
        description: selectedRole.description,
        isActive: selectedRole.isActive,
        name: selectedRole.name,
      });
    }
  }, [editingRbacRoleCode, selectedRole]);

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

  const saveGeneralPlatformSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onUpdatePlatformSetting) {
      setGeneralSaveError('General platform settings editing is not available for this admin session.');
      return;
    }

    if (!generalForm.displayName.trim()) {
      setGeneralSaveError('Platform display name is required.');
      return;
    }

    if (generalForm.supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(generalForm.supportEmail.trim())) {
      setGeneralSaveError('Support email format is invalid.');
      return;
    }

    setGeneralSaveError('');
    setGeneralSaveMessage('');
    setIsSavingGeneralSettings(true);

    const updates: Array<{ formValue: boolean | string; key: string }> = [
      { formValue: generalForm.displayName, key: GENERAL_PLATFORM_KEYS.displayName },
      { formValue: generalForm.supportEmail, key: GENERAL_PLATFORM_KEYS.supportEmail },
      { formValue: generalForm.supportPhone, key: GENERAL_PLATFORM_KEYS.supportPhone },
      { formValue: generalForm.defaultTimezone, key: GENERAL_PLATFORM_KEYS.defaultTimezone },
      { formValue: generalForm.defaultCurrency, key: GENERAL_PLATFORM_KEYS.defaultCurrency },
      { formValue: generalForm.defaultDateFormat, key: GENERAL_PLATFORM_KEYS.defaultDateFormat },
      {
        formValue: generalForm.maintenanceBannerEnabled,
        key: GENERAL_PLATFORM_KEYS.maintenanceBannerEnabled,
      },
      {
        formValue: generalForm.maintenanceBannerMessage,
        key: GENERAL_PLATFORM_KEYS.maintenanceBannerMessage,
      },
      { formValue: generalForm.operationalFooterNote, key: GENERAL_PLATFORM_KEYS.operationalFooterNote },
    ];

    try {
      let savedCount = 0;

      for (const update of updates) {
        const setting = platformSettingsByKey.get(update.key);
        if (!setting) {
          continue;
        }

        const nextValue = typeof update.formValue === 'string' ? update.formValue.trim() : update.formValue;
        if (setting.value === nextValue) {
          continue;
        }

        await onUpdatePlatformSetting(update.key, {
          value: nextValue,
          version: setting.version,
        });
        savedCount += 1;
      }

      setGeneralSaveMessage(savedCount ? 'General platform settings saved.' : 'No changes to save.');
    } catch (error) {
      setGeneralSaveError(error instanceof Error ? error.message : 'Unable to save general platform settings.');
    } finally {
      setIsSavingGeneralSettings(false);
    }
  };

  const resetTeamMemberForm = () => {
    setEditingTeamMemberId(null);
    setTeamMemberForm({
      active: true,
      city: '',
      country: 'IN',
      email: '',
      name: '',
      phone: '',
      specialization: '',
      state: '',
      type: 'external_counsel',
    });
  };

  const submitTeamMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateTeamMember || !onUpdateTeamMember || !workspace.teamRegistry.canManage) {
      setTeamRegistryError('Team and counsel registry editing is not available for this admin session.');
      return;
    }

    if (!teamMemberForm.name.trim()) {
      setTeamRegistryError('Name is required.');
      return;
    }

    if (
      teamMemberForm.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamMemberForm.email.trim())
    ) {
      setTeamRegistryError('Email format is invalid.');
      return;
    }

    setTeamRegistryError('');
    setTeamRegistryMessage('');
    setIsSavingTeamMember(true);

    try {
      const payload: TeamMemberPayload = {
        active: teamMemberForm.active,
        city: teamMemberForm.city.trim() || null,
        country: teamMemberForm.country.trim() || 'IN',
        email: teamMemberForm.email.trim() || null,
        name: teamMemberForm.name.trim(),
        phone: teamMemberForm.phone.trim() || null,
        specialization: teamMemberForm.specialization.trim() || null,
        state: teamMemberForm.state.trim() || null,
        type: teamMemberForm.type,
      };

      if (editingTeamMemberId) {
        const updatePayload: UpdateTeamMemberPayload = {
          active: payload.active,
          city: payload.city,
          country: payload.country,
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          specialization: payload.specialization,
          state: payload.state,
        };
        await onUpdateTeamMember(editingTeamMemberId, updatePayload);
        setTeamRegistryMessage('Registry entry updated.');
      } else {
        await onCreateTeamMember(payload);
        setTeamRegistryMessage('Registry entry created.');
      }

      resetTeamMemberForm();
    } catch (error) {
      setTeamRegistryError(error instanceof Error ? error.message : 'Unable to save registry entry.');
    } finally {
      setIsSavingTeamMember(false);
    }
  };

  const startEditTeamMember = (member: SettingsWorkspaceResponse['teamRegistry']['members'][number]) => {
    setEditingTeamMemberId(member.id);
    setTeamRegistryError('');
    setTeamRegistryMessage('');
    setTeamMemberForm({
      active: member.active,
      city: member.city,
      country: member.country || 'IN',
      email: member.email,
      name: member.name,
      phone: member.phone,
      specialization: member.specialization,
      state: member.state,
      type: member.type,
    });
  };

  const archiveTeamMember = async (memberId: string) => {
    if (!onArchiveTeamMember || !workspace.teamRegistry.canManage) {
      setTeamRegistryError('Team and counsel registry archive is not available for this admin session.');
      return;
    }

    setTeamRegistryError('');
    setTeamRegistryMessage('');
    setIsSavingTeamMember(true);

    try {
      await onArchiveTeamMember(memberId);
      setTeamRegistryMessage('Registry entry archived for future assignments.');
      if (editingTeamMemberId === memberId) {
        resetTeamMemberForm();
      }
    } catch (error) {
      setTeamRegistryError(error instanceof Error ? error.message : 'Unable to archive registry entry.');
    } finally {
      setIsSavingTeamMember(false);
    }
  };

  const resetServiceForm = () => {
    setEditingServiceId(null);
    setServiceForm({
      baseFee: '1000',
      code: '',
      description: '',
      domainCode: firstDomainCode,
      icon: 'Briefcase',
      isActive: true,
      name: '',
      sortOrder: '0',
    });
  };

  const submitService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateService || !onUpdateService) {
      setServiceError('Service catalog editing is not available for this admin session.');
      return;
    }

    const sortOrder = Number(serviceForm.sortOrder || 0);
    const baseFee = Number(serviceForm.baseFee || 0);
    if (!serviceForm.name.trim() || !serviceForm.domainCode) {
      setServiceError('Service name and domain are required.');
      return;
    }
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || Number.isNaN(baseFee) || baseFee < 0) {
      setServiceError('Display order and base fee must be non-negative.');
      return;
    }

    setServiceError('');
    setServiceMessage('');
    setIsSavingService(true);

    try {
      const payload = {
        baseFee,
        description: serviceForm.description.trim() || null,
        domainCode: serviceForm.domainCode,
        icon: serviceForm.icon.trim() || null,
        isActive: serviceForm.isActive,
        name: serviceForm.name.trim(),
        sortOrder,
      };

      if (editingServiceId) {
        await onUpdateService(editingServiceId, payload);
        setServiceMessage('Service updated.');
      } else {
        await onCreateService({
          ...payload,
          code: serviceForm.code.trim() || undefined,
        });
        setServiceMessage('Service created.');
      }

      resetServiceForm();
    } catch (error) {
      setServiceError(error instanceof Error ? error.message : 'Unable to save service.');
    } finally {
      setIsSavingService(false);
    }
  };

  const startEditService = (service: SettingsWorkspaceResponse['services'][number]) => {
    setEditingServiceId(service.id);
    setServiceError('');
    setServiceMessage('');
    setServiceForm({
      baseFee: String(service.baseFee || 0),
      code: service.code,
      description: service.description,
      domainCode: service.domainCode,
      icon: service.icon || 'Briefcase',
      isActive: service.isActive,
      name: service.name,
      sortOrder: String(service.sortOrder),
    });
  };

  const archiveService = async (serviceId: string) => {
    if (!onArchiveService) {
      setServiceError('Service archive is not available for this admin session.');
      return;
    }

    setServiceError('');
    setServiceMessage('');
    setIsSavingService(true);

    try {
      await onArchiveService(serviceId);
      setServiceMessage('Service archived for future records.');
      if (editingServiceId === serviceId) {
        resetServiceForm();
      }
    } catch (error) {
      setServiceError(error instanceof Error ? error.message : 'Unable to archive service.');
    } finally {
      setIsSavingService(false);
    }
  };

  const resetSlabForm = () => {
    setEditingSlabId(null);
    setSlabForm({
      baseAmount: '0',
      effectiveFrom: todayDate(),
      effectiveTo: '',
      isActive: true,
      maxServiceCount: '',
      minServiceCount: '1',
      perExtraServiceAmount: '',
    });
  };

  const resetUrgencyForm = () => {
    setEditingUrgencyId(null);
    setUrgencyForm({
      code: '',
      isActive: true,
      label: '',
      responseWindowHours: '',
      sortOrder: '0',
      surchargeType: 'flat',
      surchargeValue: '0',
    });
  };

  const submitPricingSlab = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreatePricingSlab || !onUpdatePricingSlab) {
      setPricingError('Pricing rule editing is not available for this admin session.');
      return;
    }

    const payload: PricingSlabPayload = {
      baseAmount: Number(slabForm.baseAmount),
      effectiveFrom: slabForm.effectiveFrom,
      effectiveTo: slabForm.effectiveTo || null,
      isActive: slabForm.isActive,
      maxServiceCount: slabForm.maxServiceCount ? Number(slabForm.maxServiceCount) : null,
      minServiceCount: Number(slabForm.minServiceCount),
      perExtraServiceAmount: slabForm.perExtraServiceAmount ? Number(slabForm.perExtraServiceAmount) : null,
    };

    if (!payload.effectiveFrom || !Number.isInteger(payload.minServiceCount) || payload.minServiceCount <= 0) {
      setPricingError('Pricing slab needs an effective date and positive service count.');
      return;
    }

    if (
      Number.isNaN(payload.baseAmount) ||
      payload.baseAmount < 0 ||
      Number.isNaN(payload.minServiceCount) ||
      (payload.maxServiceCount !== null && (Number.isNaN(payload.maxServiceCount) || payload.maxServiceCount < payload.minServiceCount))
    ) {
      setPricingError('Pricing slab values are invalid.');
      return;
    }

    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);

    try {
      if (editingSlabId) {
        await onUpdatePricingSlab(editingSlabId, payload);
        setPricingMessage('Pricing slab updated.');
      } else {
        await onCreatePricingSlab(payload);
        setPricingMessage('Pricing slab created.');
      }
      resetSlabForm();
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to save pricing slab.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const submitUrgencyRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateUrgencyRule || !onUpdateUrgencyRule) {
      setPricingError('Urgency rule editing is not available for this admin session.');
      return;
    }

    const payload: UrgencyRulePayload = {
      code: urgencyForm.code.trim() || undefined,
      isActive: urgencyForm.isActive,
      label: urgencyForm.label.trim(),
      responseWindowHours: urgencyForm.responseWindowHours
        ? Number(urgencyForm.responseWindowHours)
        : null,
      sortOrder: Number(urgencyForm.sortOrder || 0),
      surchargeType: urgencyForm.surchargeType,
      surchargeValue: Number(urgencyForm.surchargeValue),
    };

    if (
      !payload.label ||
      Number.isNaN(payload.surchargeValue) ||
      payload.surchargeValue < 0 ||
      (payload.responseWindowHours !== null &&
        (!Number.isInteger(payload.responseWindowHours) || payload.responseWindowHours <= 0))
    ) {
      setPricingError('Urgency rule needs a label and non-negative surcharge.');
      return;
    }

    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);

    try {
      if (editingUrgencyId) {
        const { code: _code, ...updatePayload } = payload;
        await onUpdateUrgencyRule(editingUrgencyId, updatePayload);
        setPricingMessage('Urgency rule updated.');
      } else {
        await onCreateUrgencyRule(payload);
        setPricingMessage('Urgency rule created.');
      }
      resetUrgencyForm();
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to save urgency rule.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const archiveSlab = async (slabId: string) => {
    if (!onArchivePricingSlab) {
      setPricingError('Pricing archive is not available for this admin session.');
      return;
    }
    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);
    try {
      await onArchivePricingSlab(slabId);
      setPricingMessage('Pricing slab archived for future quotes.');
      if (editingSlabId === slabId) {
        resetSlabForm();
      }
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to archive pricing slab.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const archiveUrgency = async (ruleId: string) => {
    if (!onArchiveUrgencyRule) {
      setPricingError('Urgency archive is not available for this admin session.');
      return;
    }
    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);
    try {
      await onArchiveUrgencyRule(ruleId);
      setPricingMessage('Urgency rule archived for future quotes.');
      if (editingUrgencyId === ruleId) {
        resetUrgencyForm();
      }
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to archive urgency rule.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const resetConsultationModeForm = () => {
    setEditingConsultationModeCode(null);
    setConsultationModeForm({
      code: '',
      description: '',
      isActive: true,
      label: '',
      sortOrder: '0',
      surchargeValue: '0',
      transportDisclaimer: '',
    });
  };

  const submitConsultationMode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onCreateConsultationMode || !onUpdateConsultationMode) {
      setPricingError('Consultation mode editing is not available for this admin session.');
      return;
    }

    const payload: ConsultationModePayload = {
      code: consultationModeForm.code.trim() || undefined,
      description: consultationModeForm.description.trim() || null,
      isActive: consultationModeForm.isActive,
      label: consultationModeForm.label.trim(),
      sortOrder: Number(consultationModeForm.sortOrder || 0),
      surchargeValue: Number(consultationModeForm.surchargeValue || 0),
      transportDisclaimer: consultationModeForm.transportDisclaimer.trim() || null,
    };

    if (!payload.label || Number.isNaN(payload.surchargeValue) || payload.surchargeValue! < 0) {
      setPricingError('Consultation mode needs a label and non-negative fee.');
      return;
    }

    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);
    try {
      if (editingConsultationModeCode) {
        const { code: _code, ...updatePayload } = payload;
        await onUpdateConsultationMode(editingConsultationModeCode, updatePayload);
        setPricingMessage('Consultation mode updated.');
      } else {
        await onCreateConsultationMode(payload);
        setPricingMessage('Consultation mode created.');
      }
      resetConsultationModeForm();
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to save consultation mode.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const archiveConsultationMode = async (modeCode: string) => {
    if (!onArchiveConsultationMode) {
      setPricingError('Consultation mode archive is not available for this admin session.');
      return;
    }
    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);
    try {
      await onArchiveConsultationMode(modeCode);
      setPricingMessage('Consultation mode archived for future quotes.');
      if (editingConsultationModeCode === modeCode) {
        resetConsultationModeForm();
      }
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to archive consultation mode.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const resetCountryPricingForm = () => {
    setEditingCountryPricingId(null);
    setCountryPricingForm({
      countryCode: '',
      countryName: '',
      currencyCode: 'INR',
      isActive: true,
      isDefault: false,
      multiplier: '1',
    });
  };

  const submitCountryPricing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onCreateCountryPricing || !onUpdateCountryPricing) {
      setPricingError('Country pricing editing is not available for this admin session.');
      return;
    }

    const payload: CountryPricingPayload = {
      countryCode: countryPricingForm.countryCode.trim() || undefined,
      countryName: countryPricingForm.countryName.trim(),
      currencyCode: countryPricingForm.currencyCode.trim().toUpperCase(),
      isActive: countryPricingForm.isActive,
      isDefault: countryPricingForm.isDefault,
      multiplier: Number(countryPricingForm.multiplier || 0),
    };

    if (!payload.countryName || !/^[A-Z]{3}$/.test(payload.currencyCode) || Number.isNaN(payload.multiplier) || payload.multiplier < 0) {
      setPricingError('Country pricing needs country name, ISO currency, and non-negative multiplier.');
      return;
    }

    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);
    try {
      if (editingCountryPricingId) {
        const { countryCode: _countryCode, ...updatePayload } = payload;
        await onUpdateCountryPricing(editingCountryPricingId, updatePayload);
        setPricingMessage('Country pricing updated.');
      } else {
        await onCreateCountryPricing(payload);
        setPricingMessage('Country pricing created.');
      }
      resetCountryPricingForm();
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to save country pricing.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const archiveCountryPricing = async (countryPricingId: string) => {
    if (!onArchiveCountryPricing) {
      setPricingError('Country pricing archive is not available for this admin session.');
      return;
    }
    setPricingError('');
    setPricingMessage('');
    setIsSavingPricing(true);
    try {
      await onArchiveCountryPricing(countryPricingId);
      setPricingMessage('Country pricing archived for future quotes.');
      if (editingCountryPricingId === countryPricingId) {
        resetCountryPricingForm();
      }
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : 'Unable to archive country pricing.');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const resetTemplateForm = () => {
    setEditingTemplateId(null);
    setTemplateForm({
      body: '',
      isActive: true,
      name: '',
      subject: '',
      type: 'message',
      variables: '',
    });
  };

  const startEditTemplate = (template: SettingsWorkspaceResponse['templates'][number]) => {
    setEditingTemplateId(template.id);
    setTemplateError('');
    setTemplateMessage('');
    setTemplateForm({
      body: template.body,
      isActive: template.isActive,
      name: template.name,
      subject: template.subject || '',
      type: template.type,
      variables: template.variables.join(', '),
    });
  };

  const submitTemplate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateTemplate || !onUpdateTemplate) {
      setTemplateError('Template editing is not available for this admin session.');
      return;
    }

    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      setTemplateError('Template name and body are required.');
      return;
    }

    const variables = parseCommaSeparatedValues(templateForm.variables);
    setTemplateError('');
    setTemplateMessage('');
    setIsSavingTemplate(true);

    try {
      if (editingTemplateId) {
        await onUpdateTemplate(editingTemplateId, {
          body: templateForm.body.trim(),
          isActive: templateForm.isActive,
          name: templateForm.name.trim(),
          subject: templateForm.subject.trim() || null,
          variables,
        });
        setTemplateMessage('Template updated.');
      } else {
        await onCreateTemplate({
          body: templateForm.body.trim(),
          isActive: templateForm.isActive,
          name: templateForm.name.trim(),
          subject: templateForm.subject.trim() || null,
          type: templateForm.type,
          variables,
        });
        setTemplateMessage('Template created.');
      }
      resetTemplateForm();
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Unable to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const archiveTemplate = async (templateId: string) => {
    if (!onArchiveTemplate) {
      setTemplateError('Template archive is not available for this admin session.');
      return;
    }

    setTemplateError('');
    setTemplateMessage('');
    setIsSavingTemplate(true);

    try {
      await onArchiveTemplate(templateId);
      setTemplateMessage('Template archived.');
      if (editingTemplateId === templateId) {
        resetTemplateForm();
      }
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Unable to archive template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const setDefaultTemplate = async (templateId: string) => {
    if (!onSetDefaultTemplate) {
      setTemplateError('Default template changes are not available for this admin session.');
      return;
    }

    setTemplateError('');
    setTemplateMessage('');
    setIsSavingTemplate(true);

    try {
      await onSetDefaultTemplate(templateId);
      setTemplateMessage('Default template updated.');
    } catch (error) {
      setTemplateError(error instanceof Error ? error.message : 'Unable to set default template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const resetDocumentTypeForm = () => {
    setEditingDocumentTypeId(null);
    setDocumentTypeForm({
      allowedExtensions: 'pdf,jpg,jpeg,png,doc,docx',
      category: 'general',
      clientVisibleDefault: false,
      code: '',
      description: '',
      displayOrder: '100',
      isActive: true,
      maxSizeMb: '25',
      name: '',
      requiresReview: true,
    });
  };

  const startEditDocumentType = (documentType: SettingsWorkspaceResponse['documentTypes'][number]) => {
    setEditingDocumentTypeId(documentType.id);
    setDocumentTypeError('');
    setDocumentTypeMessage('');
    setDocumentTypeForm({
      allowedExtensions: documentType.allowedExtensions.join(', '),
      category: documentType.category,
      clientVisibleDefault: documentType.clientVisibleDefault,
      code: documentType.code,
      description: documentType.description,
      displayOrder: String(documentType.displayOrder),
      isActive: documentType.isActive,
      maxSizeMb: String(documentType.maxSizeMb),
      name: documentType.name,
      requiresReview: documentType.requiresReview,
    });
  };

  const submitDocumentType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateDocumentType || !onUpdateDocumentType) {
      setDocumentTypeError('Document type editing is not available for this admin session.');
      return;
    }

    const maxSizeMb = Number(documentTypeForm.maxSizeMb);
    const displayOrder = Number(documentTypeForm.displayOrder || 0);
    const allowedExtensions = parseCommaSeparatedValues(documentTypeForm.allowedExtensions).map((extension) =>
      extension.replace(/^\./, '').toLowerCase()
    );

    if (!documentTypeForm.name.trim()) {
      setDocumentTypeError('Document type name is required.');
      return;
    }

    if (!Number.isFinite(maxSizeMb) || maxSizeMb <= 0 || maxSizeMb > 100) {
      setDocumentTypeError('Max file size must be between 1 and 100 MB.');
      return;
    }

    if (!allowedExtensions.length) {
      setDocumentTypeError('At least one allowed extension is required.');
      return;
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setDocumentTypeError('Display order must be a non-negative whole number.');
      return;
    }

    const payload: DocumentTypePayload = {
      allowedExtensions,
      category: documentTypeForm.category.trim() || 'general',
      clientVisibleDefault: documentTypeForm.clientVisibleDefault,
      description: documentTypeForm.description.trim() || null,
      displayOrder,
      isActive: documentTypeForm.isActive,
      maxSizeMb,
      name: documentTypeForm.name.trim(),
      requiresReview: documentTypeForm.requiresReview,
    };

    setDocumentTypeError('');
    setDocumentTypeMessage('');
    setIsSavingDocumentType(true);

    try {
      if (editingDocumentTypeId) {
        await onUpdateDocumentType(editingDocumentTypeId, payload);
        setDocumentTypeMessage('Document type updated.');
      } else {
        await onCreateDocumentType({
          ...payload,
          code: documentTypeForm.code.trim() || undefined,
        });
        setDocumentTypeMessage('Document type created.');
      }
      resetDocumentTypeForm();
    } catch (error) {
      setDocumentTypeError(error instanceof Error ? error.message : 'Unable to save document type.');
    } finally {
      setIsSavingDocumentType(false);
    }
  };

  const archiveDocumentType = async (documentTypeId: string) => {
    if (!onArchiveDocumentType) {
      setDocumentTypeError('Document type archive is not available for this admin session.');
      return;
    }

    setDocumentTypeError('');
    setDocumentTypeMessage('');
    setIsSavingDocumentType(true);

    try {
      await onArchiveDocumentType(documentTypeId);
      setDocumentTypeMessage('Document type archived for future uploads.');
      if (editingDocumentTypeId === documentTypeId) {
        resetDocumentTypeForm();
      }
    } catch (error) {
      setDocumentTypeError(error instanceof Error ? error.message : 'Unable to archive document type.');
    } finally {
      setIsSavingDocumentType(false);
    }
  };

  const updateNotificationSetting = async (
    typeCode: string,
    payload: NotificationDeliverySettingPayload
  ) => {
    if (!onUpdateNotificationTypeSetting) {
      setNotificationError('Notification settings editing is not available for this admin session.');
      return;
    }

    setNotificationError('');
    setNotificationMessage('');
    setSavingNotificationType(typeCode);

    try {
      await onUpdateNotificationTypeSetting(typeCode, payload);
      setNotificationMessage('Notification setting saved.');
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to save notification setting.');
    } finally {
      setSavingNotificationType(null);
    }
  };

  const resetReminderForm = () => {
    setEditingReminderId(null);
    setReminderForm({
      channelCode: 'in_app',
      eventTypeCode: '',
      isActive: true,
      offsetMinutes: '60',
    });
  };

  const startEditReminder = (setting: SettingsWorkspaceResponse['notificationSettings']['reminderSettings'][number]) => {
    setEditingReminderId(setting.id);
    setNotificationError('');
    setNotificationMessage('');
    setReminderForm({
      channelCode: setting.channelCode,
      eventTypeCode: setting.eventTypeCode || '',
      isActive: setting.isActive,
      offsetMinutes: String(setting.offsetMinutes),
    });
  };

  const submitReminderSetting = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateReminderSetting || !onUpdateReminderSetting) {
      setNotificationError('Reminder settings editing is not available for this admin session.');
      return;
    }

    const offsetMinutes = Number(reminderForm.offsetMinutes);
    if (!Number.isInteger(offsetMinutes) || offsetMinutes < 1 || offsetMinutes > 10080) {
      setNotificationError('Reminder offset must be 1 minute to 7 days.');
      return;
    }

    setNotificationError('');
    setNotificationMessage('');
    setIsSavingReminder(true);

    const payload: ReminderSettingPayload = {
      channelCode: reminderForm.channelCode,
      eventTypeCode: reminderForm.eventTypeCode || null,
      isActive: reminderForm.isActive,
      offsetMinutes,
    };

    try {
      if (editingReminderId) {
        await onUpdateReminderSetting(editingReminderId, payload);
        setNotificationMessage('Reminder offset updated.');
      } else {
        await onCreateReminderSetting(payload);
        setNotificationMessage('Reminder offset created.');
      }
      resetReminderForm();
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to save reminder offset.');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const archiveReminderSetting = async (settingId: string) => {
    if (!onArchiveReminderSetting) {
      setNotificationError('Reminder archive is not available for this admin session.');
      return;
    }

    setNotificationError('');
    setNotificationMessage('');
    setIsSavingReminder(true);

    try {
      await onArchiveReminderSetting(settingId);
      setNotificationMessage('Reminder offset archived.');
      if (editingReminderId === settingId) {
        resetReminderForm();
      }
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Unable to archive reminder offset.');
    } finally {
      setIsSavingReminder(false);
    }
  };

  const resetRbacRoleForm = () => {
    setEditingRbacRoleCode(null);
    setRbacRoleForm({
      code: '',
      description: '',
      isActive: true,
      name: '',
    });
  };

  const startEditRbacRole = (role: SettingsWorkspaceResponse['rbac']['roles'][number]) => {
    setEditingRbacRoleCode(role.code);
    setSelectedRoleCode(role.code);
    setRbacMessage('');
    setRbacError('');
    setRbacRoleForm({
      code: role.code,
      description: role.description,
      isActive: role.isActive,
      name: role.name,
    });
  };

  const submitRbacRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onCreateRbacRole || !onUpdateRbacRole) {
      setRbacError('Role editing is not available for this admin session.');
      return;
    }

    if (!rbacRoleForm.name.trim()) {
      setRbacError('Role name is required.');
      return;
    }

    setRbacError('');
    setRbacMessage('');
    setIsSavingRbac(true);

    try {
      if (editingRbacRoleCode) {
        await onUpdateRbacRole(editingRbacRoleCode, {
          description: rbacRoleForm.description.trim(),
          isActive: rbacRoleForm.isActive,
          name: rbacRoleForm.name.trim(),
        });
        setRbacMessage('Role updated.');
      } else {
        await onCreateRbacRole({
          code: rbacRoleForm.code.trim() || undefined,
          description: rbacRoleForm.description.trim(),
          name: rbacRoleForm.name.trim(),
        });
        setRbacMessage('Role created.');
      }

      resetRbacRoleForm();
    } catch (error) {
      setRbacError(error instanceof Error ? error.message : 'Unable to save role.');
    } finally {
      setIsSavingRbac(false);
    }
  };

  const archiveRbacRole = async (roleCode: string) => {
    if (!onArchiveRbacRole) {
      setRbacError('Role archive is not available for this admin session.');
      return;
    }

    setRbacError('');
    setRbacMessage('');
    setIsSavingRbac(true);

    try {
      await onArchiveRbacRole(roleCode);
      setRbacMessage('Role archived.');
      if (editingRbacRoleCode === roleCode) {
        resetRbacRoleForm();
      }
    } catch (error) {
      setRbacError(error instanceof Error ? error.message : 'Unable to archive role.');
    } finally {
      setIsSavingRbac(false);
    }
  };

  const togglePermissionCode = (permissionCode: string) => {
    setSelectedPermissionCodes((current) =>
      current.includes(permissionCode)
        ? current.filter((code) => code !== permissionCode)
        : [...current, permissionCode].sort()
    );
  };

  const saveRbacPermissions = async () => {
    if (!selectedRole || !onUpdateRbacRolePermissions) {
      setRbacError('Permission editing is not available for this admin session.');
      return;
    }

    setRbacError('');
    setRbacMessage('');
    setIsSavingRbac(true);

    try {
      await onUpdateRbacRolePermissions(selectedRole.code, { permissionCodes: selectedPermissionCodes });
      setRbacMessage('Role permissions saved.');
    } catch (error) {
      setRbacError(error instanceof Error ? error.message : 'Unable to save role permissions.');
    } finally {
      setIsSavingRbac(false);
    }
  };

  const assignRbacRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onAssignRbacUserRole) {
      setRbacError('User role assignment is not available for this admin session.');
      return;
    }

    if (!rbacUserId || !rbacUserRoleCode) {
      setRbacError('Choose a user and a role.');
      return;
    }

    setRbacError('');
    setRbacMessage('');
    setIsSavingRbac(true);

    try {
      await onAssignRbacUserRole(rbacUserId, rbacUserRoleCode);
      setRbacMessage('Role assigned.');
    } catch (error) {
      setRbacError(error instanceof Error ? error.message : 'Unable to assign role.');
    } finally {
      setIsSavingRbac(false);
    }
  };

  const removeRbacRole = async (userId: string, roleCode: string) => {
    if (!onRemoveRbacUserRole) {
      setRbacError('User role removal is not available for this admin session.');
      return;
    }

    setRbacError('');
    setRbacMessage('');
    setIsSavingRbac(true);

    try {
      await onRemoveRbacUserRole(userId, roleCode);
      setRbacMessage('Role removed.');
    } catch (error) {
      setRbacError(error instanceof Error ? error.message : 'Unable to remove role.');
    } finally {
      setIsSavingRbac(false);
    }
  };

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
          {activeTab === 'general' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Reusable mutable platform settings for safe operational defaults. Modules can opt into these values over time."
                icon={Shield}
                title="General Platform Settings"
              />
              <form
                className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5"
                onSubmit={saveGeneralPlatformSettings}
              >
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#2C2B29]">Mutable Platform Defaults</h3>
                    <p className="mt-1 text-xs text-[#8C8981]">
                      These values are persisted in shared settings storage. Existing modules will consume them as each setting becomes wired.
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!onUpdatePlatformSetting || isSavingGeneralSettings}
                    type="submit"
                  >
                    {isSavingGeneralSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SettingsInput
                    label="Platform Display Name"
                    onChange={(value) => setGeneralForm((current) => ({ ...current, displayName: value }))}
                    value={generalForm.displayName}
                  />
                  <SettingsInput
                    label="Support Email"
                    onChange={(value) => setGeneralForm((current) => ({ ...current, supportEmail: value }))}
                    placeholder="support@example.com"
                    value={generalForm.supportEmail}
                  />
                  <SettingsInput
                    label="Support Phone"
                    onChange={(value) => setGeneralForm((current) => ({ ...current, supportPhone: value }))}
                    placeholder="Optional"
                    value={generalForm.supportPhone}
                  />
                  <SettingsSelect
                    label="Default Timezone"
                    onChange={(value) => setGeneralForm((current) => ({ ...current, defaultTimezone: value }))}
                    options={[
                      { label: 'Asia/Kolkata', value: 'Asia/Kolkata' },
                      { label: 'UTC', value: 'UTC' },
                      { label: 'Europe/London', value: 'Europe/London' },
                      { label: 'America/New York', value: 'America/New_York' },
                      { label: 'Asia/Dubai', value: 'Asia/Dubai' },
                      { label: 'Asia/Singapore', value: 'Asia/Singapore' },
                    ]}
                    value={generalForm.defaultTimezone}
                  />
                  <SettingsSelect
                    label="Default Currency"
                    onChange={(value) => setGeneralForm((current) => ({ ...current, defaultCurrency: value }))}
                    options={[
                      { label: 'INR', value: 'INR' },
                      { label: 'USD', value: 'USD' },
                      { label: 'GBP', value: 'GBP' },
                      { label: 'EUR', value: 'EUR' },
                      { label: 'SGD', value: 'SGD' },
                      { label: 'AED', value: 'AED' },
                    ]}
                    value={generalForm.defaultCurrency}
                  />
                  <SettingsSelect
                    label="Default Date Format"
                    onChange={(value) => setGeneralForm((current) => ({ ...current, defaultDateFormat: value }))}
                    options={[
                      { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                      { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                      { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
                      { label: 'DD MMM YYYY', value: 'DD MMM YYYY' },
                    ]}
                    value={generalForm.defaultDateFormat}
                  />
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={generalForm.maintenanceBannerEnabled}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setGeneralForm((current) => ({
                          ...current,
                          maintenanceBannerEnabled: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Maintenance banner enabled</span>
                  </label>
                  <SettingsTextArea
                    label="Maintenance Banner Message"
                    onChange={(value) =>
                      setGeneralForm((current) => ({ ...current, maintenanceBannerMessage: value }))
                    }
                    value={generalForm.maintenanceBannerMessage}
                  />
                  <SettingsTextArea
                    label="Operational Footer Note"
                    onChange={(value) =>
                      setGeneralForm((current) => ({ ...current, operationalFooterNote: value }))
                    }
                    value={generalForm.operationalFooterNote}
                  />
                </div>

                {generalSaveError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {generalSaveError}
                  </div>
                ) : null}
                {generalSaveMessage ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {generalSaveMessage}
                  </div>
                ) : null}
              </form>

              <div className="rounded-xl border border-[#E6E4DD] bg-[#FDF8EF] p-4 text-sm text-[#5A7C96]">
                Service catalog, pricing rules, notifications, roles, templates, and document types are editable in their own tabs. Your personal admin profile, password, and preferences live in{' '}
                <a className="font-medium text-[#2C2B29] underline" href="/account?tab=profile">
                  My Account
                </a>
                .
              </div>
            </div>
          ) : null}

          {activeTab === 'team' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Manage internal coordination contacts, external counsel contacts, and field partners used in matter assignments."
                icon={Users}
                title="Team & Counsel Registry"
              />
              <form className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5" onSubmit={submitTeamMember}>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#2C2B29]">
                      {editingTeamMemberId ? 'Edit Registry Entry' : 'Create Registry Entry'}
                    </h3>
                    <p className="mt-1 text-xs text-[#8C8981]">
                      These contacts are used for coordination/reference assignments. Archived entries stay on historical matters but are hidden from new dropdowns.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingTeamMemberId ? (
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-sm text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                        onClick={resetTeamMemberForm}
                        type="button"
                      >
                        New Entry
                      </button>
                    ) : null}
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!workspace.teamRegistry.canManage || isSavingTeamMember}
                      type="submit"
                    >
                      {isSavingTeamMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingTeamMemberId ? 'Save Entry' : 'Create Entry'}
                    </button>
                  </div>
                </div>

                {!workspace.teamRegistry.canManage ? (
                  <ReadOnlyNotice text="You can view this registry, but your current role cannot manage team or counsel entries." />
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SettingsSelect
                    disabled={Boolean(editingTeamMemberId)}
                    label="Entry Type"
                    onChange={(value) =>
                      setTeamMemberForm((current) => ({
                        ...current,
                        type: value as TeamMemberType,
                      }))
                    }
                    options={TEAM_MEMBER_TYPE_OPTIONS}
                    value={teamMemberForm.type}
                  />
                  <SettingsInput
                    label="Name"
                    onChange={(value) => setTeamMemberForm((current) => ({ ...current, name: value }))}
                    value={teamMemberForm.name}
                  />
                  <SettingsInput
                    label="Email"
                    onChange={(value) => setTeamMemberForm((current) => ({ ...current, email: value }))}
                    placeholder="Optional"
                    value={teamMemberForm.email}
                  />
                  <SettingsInput
                    label="Phone"
                    onChange={(value) => setTeamMemberForm((current) => ({ ...current, phone: value }))}
                    placeholder="Optional"
                    value={teamMemberForm.phone}
                  />
                  <SettingsInput
                    label="Specialization / Role"
                    onChange={(value) =>
                      setTeamMemberForm((current) => ({ ...current, specialization: value }))
                    }
                    placeholder="Coordination, property, family, field partner..."
                    value={teamMemberForm.specialization}
                  />
                  <SettingsInput
                    label="City"
                    onChange={(value) => setTeamMemberForm((current) => ({ ...current, city: value }))}
                    placeholder="Optional"
                    value={teamMemberForm.city}
                  />
                  <SettingsInput
                    label="State"
                    onChange={(value) => setTeamMemberForm((current) => ({ ...current, state: value }))}
                    placeholder="Optional"
                    value={teamMemberForm.state}
                  />
                  <SettingsInput
                    label="Country Code"
                    onChange={(value) => setTeamMemberForm((current) => ({ ...current, country: value }))}
                    value={teamMemberForm.country}
                  />
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={teamMemberForm.active}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setTeamMemberForm((current) => ({ ...current, active: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Active for new assignments</span>
                  </label>
                </div>

                {teamRegistryError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {teamRegistryError}
                  </div>
                ) : null}
                {teamRegistryMessage ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {teamRegistryMessage}
                  </div>
                ) : null}
              </form>

              <div className="space-y-3">
                {workspace.teamRegistry.members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E6E4DD] bg-[#FCFBF8] p-6 text-sm text-[#8C8981]">
                    No team or counsel registry entries have been configured yet.
                  </div>
                ) : (
                  workspace.teamRegistry.members.map((member) => (
                    <div
                      className="flex flex-col gap-4 rounded-xl border border-[#E6E4DD] bg-white p-4 md:flex-row md:items-center md:justify-between"
                      key={member.id}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[#2C2B29]">{member.name}</p>
                          <span className="rounded-full bg-[#F4F1EA] px-2 py-0.5 text-[11px] font-medium text-[#5A7C96]">
                            {formatTeamMemberType(member.type)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              member.active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {member.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-[#8C8981]">
                          {[member.specialization, member.city, member.state, member.country]
                            .filter(Boolean)
                            .join(' · ') || 'No specialization/location configured'}
                        </p>
                        <p className="text-xs text-[#8C8981]">
                          {[member.email || 'No email', member.phone || 'No phone'].join(' · ')}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-[#E6E4DD] bg-[#FCFBF8] px-3 py-1 text-xs text-[#5A7C96]">
                          {member.assignmentCount} active assignment{member.assignmentCount === 1 ? '' : 's'}
                        </span>
                        <button
                          className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-xs font-medium text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                          disabled={!workspace.teamRegistry.canManage}
                          onClick={() => startEditTeamMember(member)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!workspace.teamRegistry.canManage || !member.active || isSavingTeamMember}
                          onClick={() => void archiveTeamMember(member.id)}
                          type="button"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'services' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Grouped from the shared service catalog and legal-domain mapping."
                icon={Layers}
                title="Service Catalog"
              />
              <form className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5" onSubmit={submitService}>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#2C2B29]">
                      {editingServiceId ? 'Edit Service' : 'Create Service'}
                    </h3>
                    <p className="mt-1 text-xs text-[#8C8981]">
                      Archiving hides a service from future dropdowns without removing historical references.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingServiceId ? (
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-sm text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                        onClick={resetServiceForm}
                        type="button"
                      >
                        New Service
                      </button>
                    ) : null}
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreateService || !onUpdateService || isSavingService}
                      type="submit"
                    >
                      {isSavingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingServiceId ? 'Save Service' : 'Create Service'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SettingsInput
                    label="Service Name"
                    onChange={(value) => setServiceForm((current) => ({ ...current, name: value }))}
                    value={serviceForm.name}
                  />
                  <SettingsInput
                    label="Service Code"
                    disabled={Boolean(editingServiceId)}
                    onChange={(value) => setServiceForm((current) => ({ ...current, code: value }))}
                    placeholder="Auto from name"
                    value={serviceForm.code}
                  />
                  <SettingsInput
                    label="Base Fee"
                    onChange={(value) => setServiceForm((current) => ({ ...current, baseFee: value }))}
                    type="number"
                    value={serviceForm.baseFee}
                  />
                  <SettingsSelect
                    label="Icon"
                    onChange={(value) => setServiceForm((current) => ({ ...current, icon: value }))}
                    options={[
                      { label: 'People', value: 'Users' },
                      { label: 'Checklist', value: 'FileCheck' },
                      { label: 'Document', value: 'FileText' },
                      { label: 'Target', value: 'Target' },
                      { label: 'Monitor', value: 'Monitor' },
                      { label: 'Briefcase', value: 'Briefcase' },
                      { label: 'Eye', value: 'Eye' },
                    ]}
                    value={serviceForm.icon}
                  />
                  <SettingsSelect
                    label="Domain"
                    onChange={(value) => setServiceForm((current) => ({ ...current, domainCode: value }))}
                    options={workspace.serviceDomains
                      .filter((domain) => domain.isActive)
                      .map((domain) => ({ label: domain.name, value: domain.code }))}
                    value={serviceForm.domainCode}
                  />
                  <SettingsInput
                    label="Display Order"
                    onChange={(value) => setServiceForm((current) => ({ ...current, sortOrder: value }))}
                    type="number"
                    value={serviceForm.sortOrder}
                  />
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={serviceForm.isActive}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, isActive: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Active for new records</span>
                  </label>
                  <SettingsTextArea
                    label="Description"
                    onChange={(value) => setServiceForm((current) => ({ ...current, description: value }))}
                    value={serviceForm.description}
                  />
                </div>
                {serviceError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {serviceError}
                  </div>
                ) : null}
                {serviceMessage ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {serviceMessage}
                  </div>
                ) : null}
              </form>
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
                            <p className="mt-2 text-xs font-medium text-[#5A7C96]">
                              Base fee: {formatCurrency(service.baseFee)}
                            </p>
                          </div>
                          <MetaPill label={service.isActive ? 'Active' : 'Inactive'} tone={service.isActive ? 'green' : 'neutral'} />
                        </div>
                        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <p className="text-[11px] text-[#A8A69F] uppercase tracking-[0.2em]">{service.code}</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                              onClick={() => startEditService(service)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={!service.isActive || isSavingService}
                              onClick={() => void archiveService(service.id)}
                              type="button"
                            >
                              Archive
                            </button>
                          </div>
                        </div>
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
              <ReadOnlyNotice text="Service-count slabs and urgency rules affect future quotes only. Historical package selections and invoices keep stored amounts." />
              {pricingError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {pricingError}
                </div>
              ) : null}
              {pricingMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {pricingMessage}
                </div>
              ) : null}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Service Slabs</h3>
                  <form className="mb-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" onSubmit={submitPricingSlab}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">
                          {editingSlabId ? 'Edit Service Slab' : 'Create Service Slab'}
                        </p>
                        <p className="text-xs text-[#8C8981] mt-1">Applies by number of selected services.</p>
                      </div>
                      {editingSlabId ? (
                        <button
                          className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96]"
                          onClick={resetSlabForm}
                          type="button"
                        >
                          New
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SettingsInput
                        label="Effective From"
                        onChange={(value) => setSlabForm((current) => ({ ...current, effectiveFrom: value }))}
                        type="date"
                        value={slabForm.effectiveFrom}
                      />
                      <SettingsInput
                        label="Effective To"
                        onChange={(value) => setSlabForm((current) => ({ ...current, effectiveTo: value }))}
                        type="date"
                        value={slabForm.effectiveTo}
                      />
                      <SettingsInput
                        label="Min Services"
                        onChange={(value) => setSlabForm((current) => ({ ...current, minServiceCount: value }))}
                        type="number"
                        value={slabForm.minServiceCount}
                      />
                      <SettingsInput
                        label="Max Services"
                        onChange={(value) => setSlabForm((current) => ({ ...current, maxServiceCount: value }))}
                        placeholder="Blank for no cap"
                        type="number"
                        value={slabForm.maxServiceCount}
                      />
                      <SettingsInput
                        label="Base Fee"
                        onChange={(value) => setSlabForm((current) => ({ ...current, baseAmount: value }))}
                        type="number"
                        value={slabForm.baseAmount}
                      />
                      <SettingsInput
                        label="Per Extra Service"
                        onChange={(value) => setSlabForm((current) => ({ ...current, perExtraServiceAmount: value }))}
                        placeholder="Optional"
                        type="number"
                        value={slabForm.perExtraServiceAmount}
                      />
                      <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                        <input
                          checked={slabForm.isActive}
                          className="h-4 w-4 accent-[#C19A5B]"
                          onChange={(event) =>
                            setSlabForm((current) => ({ ...current, isActive: event.target.checked }))
                          }
                          type="checkbox"
                        />
                        <span className="text-sm text-[#2C2B29]">Active</span>
                      </label>
                    </div>
                    <button
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreatePricingSlab || !onUpdatePricingSlab || isSavingPricing}
                      type="submit"
                    >
                      {isSavingPricing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingSlabId ? 'Save Slab' : 'Create Slab'}
                    </button>
                  </form>
                  <div className="space-y-3">
                    {workspace.pricingRules.serviceSlabs.map((slab) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={slab.id}>
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
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                            onClick={() => {
                              setEditingSlabId(slab.id);
                              setSlabForm({
                                baseAmount: String(slab.baseAmount),
                                effectiveFrom: slab.effectiveFrom,
                                effectiveTo: slab.effectiveTo || '',
                                isActive: slab.isActive,
                                maxServiceCount: slab.maxServiceCount === null ? '' : String(slab.maxServiceCount),
                                minServiceCount: String(slab.minServiceCount),
                                perExtraServiceAmount:
                                  slab.perExtraServiceAmount === null ? '' : String(slab.perExtraServiceAmount),
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!slab.isActive || isSavingPricing}
                            onClick={() => void archiveSlab(slab.id)}
                            type="button"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Urgency Surcharge</h3>
                  <form className="mb-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" onSubmit={submitUrgencyRule}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">
                          {editingUrgencyId ? 'Edit Urgency Rule' : 'Create Urgency Rule'}
                        </p>
                        <p className="text-xs text-[#8C8981] mt-1">Active rules appear in new request and matter flows.</p>
                      </div>
                      {editingUrgencyId ? (
                        <button
                          className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96]"
                          onClick={resetUrgencyForm}
                          type="button"
                        >
                          New
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SettingsInput
                        label="Label"
                        onChange={(value) => setUrgencyForm((current) => ({ ...current, label: value }))}
                        value={urgencyForm.label}
                      />
                      <SettingsInput
                        label="Code"
                        disabled={Boolean(editingUrgencyId)}
                        onChange={(value) => setUrgencyForm((current) => ({ ...current, code: value }))}
                        placeholder="Auto from label"
                        value={urgencyForm.code}
                      />
                      <SettingsSelect
                        label="Surcharge Type"
                        onChange={(value) =>
                          setUrgencyForm((current) => ({
                            ...current,
                            surchargeType: value as 'flat' | 'percent',
                          }))
                        }
                        options={[
                          { label: 'Flat', value: 'flat' },
                          { label: 'Percent', value: 'percent' },
                        ]}
                        value={urgencyForm.surchargeType}
                      />
                      <SettingsInput
                        label="Surcharge Value"
                        onChange={(value) => setUrgencyForm((current) => ({ ...current, surchargeValue: value }))}
                        type="number"
                        value={urgencyForm.surchargeValue}
                      />
                      <SettingsInput
                        label="Response Window Hours"
                        onChange={(value) => setUrgencyForm((current) => ({ ...current, responseWindowHours: value }))}
                        placeholder="48 for standard"
                        type="number"
                        value={urgencyForm.responseWindowHours}
                      />
                      <SettingsInput
                        label="Display Order"
                        onChange={(value) => setUrgencyForm((current) => ({ ...current, sortOrder: value }))}
                        type="number"
                        value={urgencyForm.sortOrder}
                      />
                      <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                        <input
                          checked={urgencyForm.isActive}
                          className="h-4 w-4 accent-[#C19A5B]"
                          onChange={(event) =>
                            setUrgencyForm((current) => ({ ...current, isActive: event.target.checked }))
                          }
                          type="checkbox"
                        />
                        <span className="text-sm text-[#2C2B29]">Active</span>
                      </label>
                    </div>
                    <button
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreateUrgencyRule || !onUpdateUrgencyRule || isSavingPricing}
                      type="submit"
                    >
                      {isSavingPricing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingUrgencyId ? 'Save Rule' : 'Create Rule'}
                    </button>
                  </form>
                  <div className="space-y-3">
                    {workspace.pricingRules.urgencyRules.map((rule) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={rule.id}>
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
                          <InfoBlock
                            label="Response Hours"
                            value={rule.responseWindowHours === null ? '—' : `${rule.responseWindowHours}h`}
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                            onClick={() => {
                              setEditingUrgencyId(rule.id);
                              setUrgencyForm({
                                code: rule.code,
                                isActive: rule.isActive,
                                label: rule.label,
                                responseWindowHours:
                                  rule.responseWindowHours === null ? '' : String(rule.responseWindowHours),
                                sortOrder: String(rule.sortOrder),
                                surchargeType: rule.surchargeType === 'percent' ? 'percent' : 'flat',
                                surchargeValue: String(rule.surchargeValue),
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!rule.isActive || isSavingPricing}
                            onClick={() => void archiveUrgency(rule.id)}
                            type="button"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Consultation Modes</h3>
                  <form className="mb-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" onSubmit={submitConsultationMode}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">
                          {editingConsultationModeCode ? 'Edit Consultation Mode' : 'Create Consultation Mode'}
                        </p>
                        <p className="mt-1 text-xs text-[#8C8981]">
                          In-person modes automatically hide urgency options under 24 hours in the client request flow.
                        </p>
                      </div>
                      {editingConsultationModeCode ? (
                        <button
                          className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96]"
                          onClick={resetConsultationModeForm}
                          type="button"
                        >
                          New
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SettingsInput
                        label="Label"
                        onChange={(value) => setConsultationModeForm((current) => ({ ...current, label: value }))}
                        value={consultationModeForm.label}
                      />
                      <SettingsInput
                        label="Code"
                        disabled={Boolean(editingConsultationModeCode)}
                        onChange={(value) => setConsultationModeForm((current) => ({ ...current, code: value }))}
                        placeholder="Auto from label"
                        value={consultationModeForm.code}
                      />
                      <SettingsInput
                        label="Fee"
                        onChange={(value) => setConsultationModeForm((current) => ({ ...current, surchargeValue: value }))}
                        type="number"
                        value={consultationModeForm.surchargeValue}
                      />
                      <SettingsInput
                        label="Display Order"
                        onChange={(value) => setConsultationModeForm((current) => ({ ...current, sortOrder: value }))}
                        type="number"
                        value={consultationModeForm.sortOrder}
                      />
                      <SettingsTextArea
                        label="Description"
                        onChange={(value) => setConsultationModeForm((current) => ({ ...current, description: value }))}
                        value={consultationModeForm.description}
                      />
                      <SettingsTextArea
                        label="Transport Disclaimer"
                        onChange={(value) =>
                          setConsultationModeForm((current) => ({ ...current, transportDisclaimer: value }))
                        }
                        value={consultationModeForm.transportDisclaimer}
                      />
                      <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                        <input
                          checked={consultationModeForm.isActive}
                          className="h-4 w-4 accent-[#C19A5B]"
                          onChange={(event) =>
                            setConsultationModeForm((current) => ({ ...current, isActive: event.target.checked }))
                          }
                          type="checkbox"
                        />
                        <span className="text-sm text-[#2C2B29]">Active</span>
                      </label>
                    </div>
                    <button
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreateConsultationMode || !onUpdateConsultationMode || isSavingPricing}
                      type="submit"
                    >
                      {isSavingPricing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingConsultationModeCode ? 'Save Mode' : 'Create Mode'}
                    </button>
                  </form>
                  <div className="space-y-3">
                    {workspace.pricingRules.consultationModes.map((mode) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={mode.code}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{mode.label}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8C8981]">{mode.code}</p>
                            {mode.transportDisclaimer ? (
                              <p className="mt-2 text-xs text-amber-700">{mode.transportDisclaimer}</p>
                            ) : null}
                          </div>
                          <MetaPill label={mode.isActive ? 'Active' : 'Inactive'} tone={mode.isActive ? 'green' : 'neutral'} />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <InfoBlock label="Fee" value={formatCurrency(mode.surchargeValue)} />
                          <InfoBlock label="Order" value={String(mode.sortOrder)} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                            onClick={() => {
                              setEditingConsultationModeCode(mode.code);
                              setConsultationModeForm({
                                code: mode.code,
                                description: mode.description,
                                isActive: mode.isActive,
                                label: mode.label,
                                sortOrder: String(mode.sortOrder),
                                surchargeValue: String(mode.surchargeValue),
                                transportDisclaimer: mode.transportDisclaimer,
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!mode.isActive || isSavingPricing}
                            onClick={() => void archiveConsultationMode(mode.code)}
                            type="button"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Country Pricing</h3>
                  <form className="mb-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" onSubmit={submitCountryPricing}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">
                          {editingCountryPricingId ? 'Edit Country Pricing' : 'Create Country Pricing'}
                        </p>
                        <p className="mt-1 text-xs text-[#8C8981]">
                          Multiplier converts base service/mode/urgency pricing into the selected currency for new requests.
                        </p>
                      </div>
                      {editingCountryPricingId ? (
                        <button
                          className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96]"
                          onClick={resetCountryPricingForm}
                          type="button"
                        >
                          New
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SettingsInput
                        label="Country Name"
                        onChange={(value) => setCountryPricingForm((current) => ({ ...current, countryName: value }))}
                        value={countryPricingForm.countryName}
                      />
                      <SettingsInput
                        label="Country Code"
                        disabled={Boolean(editingCountryPricingId)}
                        onChange={(value) => setCountryPricingForm((current) => ({ ...current, countryCode: value }))}
                        placeholder="IN, US, AU, DEFAULT"
                        value={countryPricingForm.countryCode}
                      />
                      <SettingsInput
                        label="Currency"
                        onChange={(value) =>
                          setCountryPricingForm((current) => ({ ...current, currencyCode: value.toUpperCase() }))
                        }
                        value={countryPricingForm.currencyCode}
                      />
                      <SettingsInput
                        label="Multiplier"
                        onChange={(value) => setCountryPricingForm((current) => ({ ...current, multiplier: value }))}
                        type="number"
                        value={countryPricingForm.multiplier}
                      />
                      <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                        <input
                          checked={countryPricingForm.isDefault}
                          className="h-4 w-4 accent-[#C19A5B]"
                          onChange={(event) =>
                            setCountryPricingForm((current) => ({ ...current, isDefault: event.target.checked }))
                          }
                          type="checkbox"
                        />
                        <span className="text-sm text-[#2C2B29]">Default fallback</span>
                      </label>
                      <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                        <input
                          checked={countryPricingForm.isActive}
                          className="h-4 w-4 accent-[#C19A5B]"
                          onChange={(event) =>
                            setCountryPricingForm((current) => ({ ...current, isActive: event.target.checked }))
                          }
                          type="checkbox"
                        />
                        <span className="text-sm text-[#2C2B29]">Active</span>
                      </label>
                    </div>
                    <button
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreateCountryPricing || !onUpdateCountryPricing || isSavingPricing}
                      type="submit"
                    >
                      {isSavingPricing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingCountryPricingId ? 'Save Country' : 'Create Country'}
                    </button>
                  </form>
                  <div className="space-y-3">
                    {workspace.pricingRules.countryPricing.map((rule) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={rule.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{rule.countryName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8C8981]">
                              {rule.countryCode} · {rule.currencyCode}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {rule.isDefault ? <MetaPill label="Default" tone="blue" /> : null}
                            <MetaPill label={rule.isActive ? 'Active' : 'Inactive'} tone={rule.isActive ? 'green' : 'neutral'} />
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <InfoBlock label="Multiplier" value={String(rule.multiplier)} />
                          <InfoBlock label="Currency" value={rule.currencyCode} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                            onClick={() => {
                              setEditingCountryPricingId(rule.id);
                              setCountryPricingForm({
                                countryCode: rule.countryCode,
                                countryName: rule.countryName,
                                currencyCode: rule.currencyCode,
                                isActive: rule.isActive,
                                isDefault: rule.isDefault,
                                multiplier: String(rule.multiplier),
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!rule.isActive || rule.isDefault || isSavingPricing}
                            onClick={() => void archiveCountryPricing(rule.id)}
                            type="button"
                          >
                            Archive
                          </button>
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
                description="Configure in-app notification behavior, provider availability, templates, and event reminder offsets."
                icon={Bell}
                title="Notification Settings"
              />
              <ReadOnlyNotice text="Provider status is honest: email and SMS cannot be enabled unless the corresponding provider mode is configured outside disabled mode. In-app/local delivery remains available." />
              {notificationError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {notificationError}
                </div>
              ) : null}
              {notificationMessage ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {notificationMessage}
                </div>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <InfoBlock label="In-App" value={workspace.notificationSettings.providerMode.inApp} />
                <InfoBlock label="Email Provider" value={workspace.notificationSettings.providerMode.email} />
                <InfoBlock label="SMS Provider" value={workspace.notificationSettings.providerMode.sms} />
                <InfoBlock label="Push Provider" value={workspace.notificationSettings.providerMode.push} />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Notification Types</h3>
                  <div className="space-y-3">
                    {workspace.notificationSettings.deliverySettings.map((setting) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={setting.typeCode}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">{setting.label}</p>
                            <p className="text-[11px] text-[#A8A69F] mt-1 uppercase tracking-[0.2em]">
                              {setting.typeCode}
                            </p>
                          </div>
                          <MetaPill label={setting.isActive ? 'Active' : 'Inactive'} tone={setting.isActive ? 'green' : 'neutral'} />
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                            <input
                              checked={setting.inAppEnabled}
                              className="h-4 w-4 accent-[#C19A5B]"
                              disabled={savingNotificationType === setting.typeCode}
                              onChange={(event) =>
                                void updateNotificationSetting(setting.typeCode, {
                                  inAppEnabled: event.target.checked,
                                })
                              }
                              type="checkbox"
                            />
                            <span className="text-sm text-[#2C2B29]">In-app</span>
                          </label>
                          <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                            <input
                              checked={setting.emailEnabled}
                              className="h-4 w-4 accent-[#C19A5B]"
                              disabled={
                                workspace.notificationSettings.providerMode.email === 'disabled' ||
                                savingNotificationType === setting.typeCode
                              }
                              onChange={(event) =>
                                void updateNotificationSetting(setting.typeCode, {
                                  emailEnabled: event.target.checked,
                                })
                              }
                              type="checkbox"
                            />
                            <span className="text-sm text-[#2C2B29]">
                              Email
                              {workspace.notificationSettings.providerMode.email === 'disabled' ? ' (provider off)' : ''}
                            </span>
                          </label>
                          <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                            <input
                              checked={setting.smsEnabled}
                              className="h-4 w-4 accent-[#C19A5B]"
                              disabled={
                                workspace.notificationSettings.providerMode.sms === 'disabled' ||
                                savingNotificationType === setting.typeCode
                              }
                              onChange={(event) =>
                                void updateNotificationSetting(setting.typeCode, {
                                  smsEnabled: event.target.checked,
                                })
                              }
                              type="checkbox"
                            />
                            <span className="text-sm text-[#2C2B29]">
                              SMS
                              {workspace.notificationSettings.providerMode.sms === 'disabled' ? ' (provider off)' : ''}
                            </span>
                          </label>
                          <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                            <input
                              checked={setting.isActive}
                              className="h-4 w-4 accent-[#C19A5B]"
                              disabled={savingNotificationType === setting.typeCode}
                              onChange={(event) =>
                                void updateNotificationSetting(setting.typeCode, {
                                  isActive: event.target.checked,
                                })
                              }
                              type="checkbox"
                            />
                            <span className="text-sm text-[#2C2B29]">Setting active</span>
                          </label>
                        </div>
                        <div className="mt-3">
                          <SettingsSelect
                            label="Notification Template"
                            onChange={(value) =>
                              void updateNotificationSetting(setting.typeCode, {
                                templateId: value || null,
                              })
                            }
                            options={[
                              { label: 'Use built-in copy', value: '' },
                              ...workspace.notificationSettings.templates.map((template) => ({
                                label: template.name,
                                value: template.id,
                              })),
                            ]}
                            value={setting.templateId || ''}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#2C2B29] mb-3">Reminder Offsets</h3>
                  <form className="mb-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" onSubmit={submitReminderSetting}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">
                          {editingReminderId ? 'Edit Reminder Offset' : 'Create Reminder Offset'}
                        </p>
                        <p className="text-xs text-[#8C8981] mt-1">
                          New and updated events use active offsets. Existing pending reminders are not changed until the event is updated.
                        </p>
                      </div>
                      {editingReminderId ? (
                        <button
                          className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96]"
                          onClick={resetReminderForm}
                          type="button"
                        >
                          New
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <SettingsInput
                        label="Offset Minutes"
                        onChange={(value) => setReminderForm((current) => ({ ...current, offsetMinutes: value }))}
                        type="number"
                        value={reminderForm.offsetMinutes}
                      />
                      <SettingsSelect
                        label="Channel"
                        onChange={(value) =>
                          setReminderForm((current) => ({
                            ...current,
                            channelCode: value as ReminderFormState['channelCode'],
                          }))
                        }
                        options={[
                          { label: 'In-app / Local', value: 'in_app' },
                          {
                            label:
                              workspace.notificationSettings.providerMode.email === 'disabled'
                                ? 'Email (provider off)'
                                : 'Email',
                            value: 'email',
                          },
                          {
                            label:
                              workspace.notificationSettings.providerMode.sms === 'disabled'
                                ? 'SMS (provider off)'
                                : 'SMS',
                            value: 'sms',
                          },
                        ]}
                        value={reminderForm.channelCode}
                      />
                      <SettingsSelect
                        label="Event Type"
                        onChange={(value) =>
                          setReminderForm((current) => ({ ...current, eventTypeCode: value }))
                        }
                        options={[
                          { label: 'All client-visible events', value: '' },
                          ...workspace.notificationSettings.eventTypes.map((eventType) => ({
                            label: eventType.label,
                            value: eventType.code,
                          })),
                        ]}
                        value={reminderForm.eventTypeCode}
                      />
                      <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                        <input
                          checked={reminderForm.isActive}
                          className="h-4 w-4 accent-[#C19A5B]"
                          onChange={(event) =>
                            setReminderForm((current) => ({ ...current, isActive: event.target.checked }))
                          }
                          type="checkbox"
                        />
                        <span className="text-sm text-[#2C2B29]">Active</span>
                      </label>
                    </div>
                    <button
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreateReminderSetting || !onUpdateReminderSetting || isSavingReminder}
                      type="submit"
                    >
                      {isSavingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingReminderId ? 'Save Offset' : 'Create Offset'}
                    </button>
                  </form>
                  <div className="space-y-3">
                    {workspace.notificationSettings.reminderSettings.map((setting) => (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={setting.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#2C2B29]">
                              {formatReminderOffset(setting.offsetMinutes)}
                            </p>
                            <p className="text-xs text-[#8C8981] mt-1">
                              {setting.eventTypeLabel} · {setting.channelCode === 'in_app' ? 'in-app/local' : setting.channelCode}
                            </p>
                          </div>
                          <MetaPill label={setting.isActive ? 'Active' : 'Inactive'} tone={setting.isActive ? 'green' : 'neutral'} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                            onClick={() => startEditReminder(setting)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!setting.isActive || isSavingReminder}
                            onClick={() => void archiveReminderSetting(setting.id)}
                            type="button"
                          >
                            Archive
                          </button>
                        </div>
                      </div>
                    ))}
                    {workspace.notificationSettings.reminderSettings.length === 0 ? (
                      <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-6 text-sm text-[#8C8981]">
                        No reminder offsets are active. New events will not create reminder jobs until one is added.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'roles' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Manage custom admin roles, permission grants, and staff role assignments with server-side lockout protections."
                icon={Shield}
                title="Roles & Permissions"
              />
              {!workspace.rbac.canManage ? (
                <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-6 text-sm text-[#8C8981]">
                  Your current admin role can view the settings surface, but RBAC detail is restricted to actors with `rbac.manage`.
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FFF7E6] p-4 text-sm text-[#6F5B21]">
                    System roles, client access, and the final `ops_admin` assignment are protected by the server.
                    Changes to your own access are blocked if they would remove dashboard, settings, or RBAC management.
                  </div>
                  {rbacError ? (
                    <div className="rounded-xl border border-[#F1B8B8] bg-[#FFF5F5] p-4 text-sm text-[#9E3D3D]">
                      {rbacError}
                    </div>
                  ) : null}
                  {rbacMessage ? (
                    <div className="rounded-xl border border-[#B8D8C2] bg-[#F4FBF5] p-4 text-sm text-[#337348]">
                      {rbacMessage}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5">
                    <div className="space-y-4">
                      <form className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5" onSubmit={submitRbacRole}>
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-medium text-[#2C2B29]">
                              {editingRbacRoleCode ? 'Edit Custom Role' : 'Create Custom Role'}
                            </h3>
                            <p className="mt-1 text-xs text-[#8C8981]">
                              Custom roles can be activated, archived, and assigned a permission checklist.
                            </p>
                          </div>
                          {editingRbacRoleCode ? (
                            <button
                              className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                              onClick={resetRbacRoleForm}
                              type="button"
                            >
                              New Role
                            </button>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="text-sm text-[#5A5751]">
                            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-[#A8A69F]">Role name</span>
                            <input
                              className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29]"
                              onChange={(event) => setRbacRoleForm((current) => ({ ...current, name: event.target.value }))}
                              value={rbacRoleForm.name}
                            />
                          </label>
                          <label className="text-sm text-[#5A5751]">
                            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-[#A8A69F]">Role code</span>
                            <input
                              className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29] disabled:bg-[#F4F1EA]"
                              disabled={Boolean(editingRbacRoleCode)}
                              onChange={(event) => setRbacRoleForm((current) => ({ ...current, code: event.target.value }))}
                              placeholder="auto-generated"
                              value={rbacRoleForm.code}
                            />
                          </label>
                          <label className="md:col-span-2 text-sm text-[#5A5751]">
                            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-[#A8A69F]">Description</span>
                            <textarea
                              className="min-h-[88px] w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29]"
                              onChange={(event) =>
                                setRbacRoleForm((current) => ({ ...current, description: event.target.value }))
                              }
                              value={rbacRoleForm.description}
                            />
                          </label>
                          {editingRbacRoleCode ? (
                            <label className="flex items-center gap-2 text-sm text-[#5A5751]">
                              <input
                                checked={rbacRoleForm.isActive}
                                className="h-4 w-4 rounded border-[#D8D3C8]"
                                onChange={(event) =>
                                  setRbacRoleForm((current) => ({ ...current, isActive: event.target.checked }))
                                }
                                type="checkbox"
                              />
                              Active
                            </label>
                          ) : null}
                        </div>
                        <button
                          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#5A7C96] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4D6C83] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isSavingRbac || !onCreateRbacRole || !onUpdateRbacRole}
                          type="submit"
                        >
                          {isSavingRbac ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {editingRbacRoleCode ? 'Save Role' : 'Create Role'}
                        </button>
                      </form>

                      <div className="space-y-3">
                        {workspace.rbac.roles.map((role) => {
                          const isSelected = selectedRoleCode === role.code;
                          return (
                            <button
                              className={`w-full rounded-xl border p-4 text-left transition ${
                                isSelected
                                  ? 'border-[#5A7C96] bg-[#F5F8FA]'
                                  : 'border-[#E6E4DD] bg-[#FCFBF8] hover:bg-[#F4F1EA]'
                              }`}
                              key={role.code}
                              onClick={() => {
                                setSelectedRoleCode(role.code);
                                setRbacError('');
                                setRbacMessage('');
                              }}
                              type="button"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-[#2C2B29]">{role.name}</p>
                                  <p className="mt-1 text-xs text-[#8C8981]">{role.description || role.code}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <MetaPill label={role.isActive ? 'Active' : 'Inactive'} tone={role.isActive ? 'green' : 'neutral'} />
                                  <MetaPill label={role.isSystem ? 'System' : 'Custom'} tone={role.isSystem ? 'neutral' : 'blue'} />
                                </div>
                              </div>
                              <div className="mt-4 grid grid-cols-2 gap-3">
                                <InfoBlock label="Users" value={String(role.userCount)} />
                                <InfoBlock label="Permissions" value={String(role.permissionCodes.length)} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-5">
                      {selectedRole ? (
                        <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h3 className="text-sm font-medium text-[#2C2B29]">{selectedRole.name}</h3>
                              <p className="mt-1 text-xs text-[#8C8981]">{selectedRole.code}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={selectedRole.isSystem || isSavingRbac}
                                onClick={() => startEditRbacRole(selectedRole)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={selectedRole.isSystem || !selectedRole.isActive || isSavingRbac}
                                onClick={() => void archiveRbacRole(selectedRole.code)}
                                type="button"
                              >
                                Archive
                              </button>
                            </div>
                          </div>
                          {selectedRole.isSystem ? (
                            <div className="mt-4 rounded-lg border border-[#E6E4DD] bg-white p-3 text-xs text-[#8C8981]">
                              System role permissions are visible for review but cannot be edited from this workspace.
                            </div>
                          ) : null}
                          <div className="mt-5 space-y-5">
                            {permissionsByModule.map(([moduleName, permissions]) => (
                              <div key={moduleName}>
                                <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[#A8A69F]">
                                  {moduleName}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {permissions.map((permission) => (
                                    <label
                                      className="flex items-start gap-2 rounded-lg border border-[#E6E4DD] bg-white p-3 text-sm text-[#5A5751]"
                                      key={permission.code}
                                    >
                                      <input
                                        checked={selectedPermissionCodes.includes(permission.code)}
                                        className="mt-0.5 h-4 w-4 rounded border-[#D8D3C8]"
                                        disabled={selectedRole.isSystem}
                                        onChange={() => togglePermissionCode(permission.code)}
                                        type="checkbox"
                                      />
                                      <span>
                                        <span className="block text-xs font-medium text-[#2C2B29]">
                                          {permission.description || permission.code}
                                        </span>
                                        <span className="mt-1 block text-[11px] text-[#A8A69F]">{permission.code}</span>
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#5A7C96] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4D6C83] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={selectedRole.isSystem || isSavingRbac || !onUpdateRbacRolePermissions}
                            onClick={() => void saveRbacPermissions()}
                            type="button"
                          >
                            {isSavingRbac ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Permissions
                          </button>
                        </div>
                      ) : null}

                      <form className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5" onSubmit={assignRbacRole}>
                        <h3 className="text-sm font-medium text-[#2C2B29]">User Role Assignment</h3>
                        <p className="mt-1 text-xs text-[#8C8981]">
                          Assign active admin roles to staff users. Client portal roles are not managed here.
                        </p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="text-sm text-[#5A5751]">
                            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-[#A8A69F]">Admin user</span>
                            <select
                              className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29]"
                              onChange={(event) => setRbacUserId(event.target.value)}
                              value={rbacUserId}
                            >
                              {workspace.rbac.users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.displayName} · {user.email}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm text-[#5A5751]">
                            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-[#A8A69F]">Role</span>
                            <select
                              className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29]"
                              onChange={(event) => setRbacUserRoleCode(event.target.value)}
                              value={rbacUserRoleCode}
                            >
                              {activeAssignableRoles.map((role) => (
                                <option key={role.code} value={role.code}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <button
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#5A7C96] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4D6C83] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isSavingRbac || !onAssignRbacUserRole || !rbacUserId || !rbacUserRoleCode}
                          type="submit"
                        >
                          {isSavingRbac ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Assign Role
                        </button>
                        <div className="mt-5 space-y-3">
                          {workspace.rbac.users.map((user) => (
                            <div className="rounded-lg border border-[#E6E4DD] bg-white p-3" key={user.id}>
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="text-sm font-medium text-[#2C2B29]">{user.displayName}</p>
                                  <p className="mt-1 text-xs text-[#8C8981]">{user.email}</p>
                                </div>
                                <p className="text-xs text-[#8C8981]">{user.permissionCodes.length} permissions</p>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {user.roleCodes.map((roleCode) => (
                                  <button
                                    className="rounded-full border border-[#E6E4DD] bg-[#FCFBF8] px-3 py-1 text-xs text-[#5A5751] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={isSavingRbac || !onRemoveRbacUserRole}
                                    key={roleCode}
                                    onClick={() => void removeRbacRole(user.id, roleCode)}
                                    title="Remove role"
                                    type="button"
                                  >
                                    {roleCode} ×
                                  </button>
                                ))}
                                {user.roleCodes.length === 0 ? (
                                  <span className="text-xs text-[#A8A69F]">No active roles</span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {activeTab === 'templates' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Reusable admin-managed copy for operational messages, notifications, invoice notes, and document checklists."
                icon={Layers}
                title="Templates"
              />
              <ReadOnlyNotice text="Templates are DB-backed and editable. Message templates can be inserted into the admin message composer; invoice templates remain reusable copy until the invoice layout/PDF pipeline consumes them." />
              <form className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5" onSubmit={submitTemplate}>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#2C2B29]">
                      {editingTemplateId ? 'Edit Template' : 'Create Template'}
                    </h3>
                    <p className="mt-1 text-xs text-[#8C8981]">
                      Allowed variables are validated on save. Archived templates stay available historically but are hidden from new use.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingTemplateId ? (
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-sm text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                        onClick={resetTemplateForm}
                        type="button"
                      >
                        New Template
                      </button>
                    ) : null}
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreateTemplate || !onUpdateTemplate || isSavingTemplate}
                      type="submit"
                    >
                      {isSavingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingTemplateId ? 'Save Template' : 'Create Template'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SettingsInput
                    label="Template Name"
                    onChange={(value) => setTemplateForm((current) => ({ ...current, name: value }))}
                    value={templateForm.name}
                  />
                  <SettingsSelect
                    label="Template Type"
                    onChange={(value) =>
                      setTemplateForm((current) => ({ ...current, type: value as TemplateType }))
                    }
                    options={TEMPLATE_TYPE_OPTIONS}
                    value={templateForm.type}
                  />
                  <SettingsInput
                    label="Subject"
                    onChange={(value) => setTemplateForm((current) => ({ ...current, subject: value }))}
                    placeholder="Optional"
                    value={templateForm.subject}
                  />
                  <SettingsInput
                    label="Variables"
                    onChange={(value) => setTemplateForm((current) => ({ ...current, variables: value }))}
                    placeholder="clientName, matterTitle"
                    value={templateForm.variables}
                  />
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={templateForm.isActive}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setTemplateForm((current) => ({ ...current, isActive: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Active for new use</span>
                  </label>
                  <SettingsTextArea
                    label="Body"
                    onChange={(value) => setTemplateForm((current) => ({ ...current, body: value }))}
                    value={templateForm.body}
                  />
                </div>
                <div className="mt-4 rounded-xl border border-[#E6E4DD] bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A8A69F]">
                    Preview with sample variables
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2C2B29]">
                    {renderTemplatePreview(templateForm.body || 'Template preview appears here.')}
                  </p>
                </div>
                {templateError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {templateError}
                  </div>
                ) : null}
                {templateMessage ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {templateMessage}
                  </div>
                ) : null}
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workspace.templates.map((template) => (
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={template.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">{template.name}</p>
                        <p className="text-xs text-[#8C8981] mt-1">
                          {template.subject || 'No subject'} · v{template.version}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <MetaPill label={formatTemplateType(template.type)} tone="blue" />
                        {template.isDefault ? <MetaPill label="Default" tone="amber" /> : null}
                        <MetaPill label={template.isActive ? 'Active' : 'Inactive'} tone={template.isActive ? 'green' : 'neutral'} />
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-[#5A7C96]">
                      {template.body}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.length ? (
                        template.variables.map((variable) => (
                          <span
                            className="rounded-full border border-[#E6E4DD] bg-white px-2 py-1 text-[10px] text-[#8C8981]"
                            key={`${template.id}-${variable}`}
                          >
                            {`{{${variable}}}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#A8A69F]">No declared variables.</span>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                        onClick={() => startEditTemplate(template)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!template.isActive || template.isDefault || isSavingTemplate}
                        onClick={() => void setDefaultTemplate(template.id)}
                        type="button"
                      >
                        Set Default
                      </button>
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!template.isActive || isSavingTemplate}
                        onClick={() => void archiveTemplate(template.id)}
                        type="button"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
                {workspace.templates.length === 0 ? (
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-6 text-sm text-[#8C8981] md:col-span-2">
                    No templates have been configured yet.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'documents' ? (
            <div className="space-y-6">
              <SectionHeader
                description="Configurable document type registry for admin and client upload workflows."
                icon={FileStack}
                title="Document Types"
              />
              <ReadOnlyNotice text="Active document types guide future uploads. Existing documents without a configured type continue to render." />
              <form className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-5" onSubmit={submitDocumentType}>
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[#2C2B29]">
                      {editingDocumentTypeId ? 'Edit Document Type' : 'Create Document Type'}
                    </h3>
                    <p className="mt-1 text-xs text-[#8C8981]">
                      Archive types instead of deleting them so historical documents keep their metadata.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingDocumentTypeId ? (
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-4 py-2 text-sm text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                        onClick={resetDocumentTypeForm}
                        type="button"
                      >
                        New Type
                      </button>
                    ) : null}
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2C2B29] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4A4946] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!onCreateDocumentType || !onUpdateDocumentType || isSavingDocumentType}
                      type="submit"
                    >
                      {isSavingDocumentType ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {editingDocumentTypeId ? 'Save Type' : 'Create Type'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SettingsInput
                    label="Name"
                    onChange={(value) => setDocumentTypeForm((current) => ({ ...current, name: value }))}
                    value={documentTypeForm.name}
                  />
                  <SettingsInput
                    label="Code"
                    disabled={Boolean(editingDocumentTypeId)}
                    onChange={(value) => setDocumentTypeForm((current) => ({ ...current, code: value }))}
                    placeholder="Auto from name"
                    value={documentTypeForm.code}
                  />
                  <SettingsInput
                    label="Category"
                    onChange={(value) => setDocumentTypeForm((current) => ({ ...current, category: value }))}
                    value={documentTypeForm.category}
                  />
                  <SettingsInput
                    label="Allowed Extensions"
                    onChange={(value) =>
                      setDocumentTypeForm((current) => ({ ...current, allowedExtensions: value }))
                    }
                    placeholder="pdf,jpg,png"
                    value={documentTypeForm.allowedExtensions}
                  />
                  <SettingsInput
                    label="Max Size MB"
                    onChange={(value) => setDocumentTypeForm((current) => ({ ...current, maxSizeMb: value }))}
                    type="number"
                    value={documentTypeForm.maxSizeMb}
                  />
                  <SettingsInput
                    label="Display Order"
                    onChange={(value) => setDocumentTypeForm((current) => ({ ...current, displayOrder: value }))}
                    type="number"
                    value={documentTypeForm.displayOrder}
                  />
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={documentTypeForm.requiresReview}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setDocumentTypeForm((current) => ({ ...current, requiresReview: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Requires review</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={documentTypeForm.clientVisibleDefault}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setDocumentTypeForm((current) => ({
                          ...current,
                          clientVisibleDefault: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Client-visible by default</span>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-[#E6E4DD] bg-white px-3 py-2">
                    <input
                      checked={documentTypeForm.isActive}
                      className="h-4 w-4 accent-[#C19A5B]"
                      onChange={(event) =>
                        setDocumentTypeForm((current) => ({ ...current, isActive: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span className="text-sm text-[#2C2B29]">Active for uploads</span>
                  </label>
                  <SettingsTextArea
                    label="Description"
                    onChange={(value) =>
                      setDocumentTypeForm((current) => ({ ...current, description: value }))
                    }
                    value={documentTypeForm.description}
                  />
                </div>
                {documentTypeError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {documentTypeError}
                  </div>
                ) : null}
                {documentTypeMessage ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {documentTypeMessage}
                  </div>
                ) : null}
              </form>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {workspace.documentTypes.map((documentType) => (
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-4" key={documentType.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#2C2B29]">{documentType.name}</p>
                        <p className="text-[11px] text-[#A8A69F] mt-1 uppercase tracking-[0.2em]">
                          {documentType.code}
                        </p>
                      </div>
                      <MetaPill label={documentType.isActive ? 'Active' : 'Inactive'} tone={documentType.isActive ? 'green' : 'neutral'} />
                    </div>
                    <p className="mt-2 text-xs text-[#8C8981]">{documentType.description || 'No description set.'}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoBlock label="Category" value={documentType.category} />
                      <InfoBlock label="Max Size" value={`${documentType.maxSizeMb} MB`} />
                      <InfoBlock label="Review" value={documentType.requiresReview ? 'Required' : 'Optional'} />
                      <InfoBlock label="Usage" value={String(documentType.usageCount || 0)} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {documentType.allowedExtensions.map((extension) => (
                        <span
                          className="rounded-full border border-[#E6E4DD] bg-white px-2 py-1 text-[10px] text-[#8C8981]"
                          key={`${documentType.id}-${extension}`}
                        >
                          .{extension}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#5A7C96] transition hover:bg-[#F4F1EA]"
                        onClick={() => startEditDocumentType(documentType)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-[#E6E4DD] bg-white px-3 py-1.5 text-xs text-[#8C8981] transition hover:bg-[#F4F1EA] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!documentType.isActive || isSavingDocumentType}
                        onClick={() => void archiveDocumentType(documentType.id)}
                        type="button"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
                {workspace.documentTypes.length === 0 ? (
                  <div className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF8] p-6 text-sm text-[#8C8981] md:col-span-2 xl:col-span-3">
                    No document types have been configured yet.
                  </div>
                ) : null}
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

const ReadOnlyNotice = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-[#E6E4DD] bg-[#FDF8EF] px-4 py-3 text-sm text-[#5A7C96]">
    {text}
  </div>
);

const SettingsInput = ({
  disabled = false,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'date' | 'number' | 'text';
  value: string;
}) => (
  <label className="space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A8A69F]">{label}</span>
    <input
      className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29] outline-none transition focus:border-[#C19A5B] disabled:cursor-not-allowed disabled:bg-[#F4F1EA] disabled:text-[#8C8981]"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  </label>
);

const SettingsSelect = ({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) => (
  <label className="space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A8A69F]">{label}</span>
    <select
      className="w-full rounded-lg border border-[#E6E4DD] bg-white px-3 py-2 text-sm text-[#2C2B29] outline-none transition focus:border-[#C19A5B] disabled:cursor-not-allowed disabled:bg-[#F4F1EA] disabled:text-[#8C8981]"
      disabled={disabled}
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
