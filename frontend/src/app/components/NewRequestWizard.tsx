import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, 
  Users, 
  FileCheck, 
  FileText, 
  Target, 
  Eye, 
  Briefcase, 
  Monitor,
  Phone,
  Video,
  UserCheck,
  Upload,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import {
  REQUEST_WIZARD_SERVICES,
  LEGAL_DOMAINS, 
  TIME_SLOTS,
  calculateFee,
  type ConsultationMode,
  type UrgencyLevel,
  type RequestData
} from '../data/requestWizardData';

interface NewRequestWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RequestData) => Promise<void> | void;
  userName?: string;
  userEmail?: string;
  userMobile?: string;
}

export type { RequestData };

const serviceIcons: Record<string, React.ElementType> = {
  'Users': Users,
  'FileCheck': FileCheck,
  'FileText': FileText,
  'Target': Target,
  'Eye': Eye,
  'Briefcase': Briefcase,
  'Monitor': Monitor
};

export const NewRequestWizard: React.FC<NewRequestWizardProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userName = '',
  userEmail = '',
  userMobile = ''
}) => {
  const createInitialFormData = (): RequestData => ({
    fullName: userName,
    email: userEmail,
    mobile: userMobile,
    whatsappSame: true,
    services: [],
    legalDomain: '',
    caseDetails: '',
    documents: [],
    consultationMode: 'video',
    preferredDate: '',
    preferredTime: '',
    urgency: 'standard',
    pastLegalAction: false
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RequestData>(createInitialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalSteps = 7;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...Array.from(e.target.files!)]
      }));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    let didClose = false;

    try {
      await onSubmit(formData);
      setCurrentStep(1);
      setFormData(createInitialFormData());
      didClose = true;
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'We could not submit your request right now. Please try again.'
      );
    } finally {
      if (!didClose) {
        setIsSubmitting(false);
      }
    }
  };

  const fee = calculateFee(formData.services.length);
  const urgencySurcharge = formData.urgency === 'within-6hrs' ? 500 : formData.urgency === 'within-2hrs' ? 1000 : 0;
  const totalFee = fee + urgencySurcharge;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!isSubmitting) {
              onClose();
            }
          }}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          aria-busy={isSubmitting}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    New Request
                  </h2>
                  <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">
                    Step {currentStep} of {totalSteps}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 overflow-y-auto max-h-[calc(90vh-280px)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Step 1: Confirm Details */}
                {currentStep === 1 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Confirm Your Details</h3>
                    <p className="text-gray-500 mb-8">Please verify your contact information</p>
                    
                    <div className="bg-gray-50 rounded-2xl p-6 md:p-8 space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full text-lg font-semibold bg-transparent border-none outline-none"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full text-lg font-semibold bg-transparent border-none outline-none"
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                          Mobile
                        </label>
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          className="w-full text-lg font-semibold bg-transparent border-none outline-none"
                          placeholder="+Country code XXXXXXXX"
                        />
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.whatsappSame}
                          onChange={(e) => setFormData({ ...formData, whatsappSame: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">WhatsApp number is same as mobile</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 2: Select Services */}
                {currentStep === 2 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Select Primary Service</h3>
                    <p className="text-gray-500 mb-8">Choose one or multiple services you need</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {REQUEST_WIZARD_SERVICES.map((service) => {
                        const IconComponent = serviceIcons[service.icon];
                        const isSelected = formData.services.includes(service.id);
                        
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleServiceToggle(service.id)}
                            className={`p-6 rounded-2xl border-2 transition-all text-left ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-100'
                                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {IconComponent && <IconComponent size={24} />}
                            </div>
                            <h4 className="font-bold mb-1">{service.name}</h4>
                            <p className="text-sm text-gray-500">{service.description}</p>
                            {isSelected && (
                              <div className="mt-4 flex items-center gap-2 text-blue-600 text-sm font-bold">
                                <CheckCircle size={16} />
                                Selected
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {formData.services.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-sm font-bold text-blue-900">
                          {formData.services.length} service{formData.services.length > 1 ? 's' : ''} selected • 
                          Base fee: ₹{calculateFee(formData.services.length).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Legal Domain */}
                {currentStep === 3 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Legal Domain</h3>
                    <p className="text-gray-500 mb-8">Which category does your case fall under?</p>
                    
                    <div className="space-y-3">
                      {LEGAL_DOMAINS.map((domain) => (
                        <button
                          key={domain.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, legalDomain: domain.id })}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                            formData.legalDomain === domain.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.legalDomain === domain.id
                              ? 'border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {formData.legalDomain === domain.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{domain.name}</p>
                            <p className="text-xs text-gray-500">{domain.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Case Details */}
                {currentStep === 4 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Case Details</h3>
                    <p className="text-gray-500 mb-8">Describe the specific issue clearly.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <textarea
                          value={formData.caseDetails}
                          onChange={(e) => setFormData({ ...formData, caseDetails: e.target.value })}
                          placeholder="e.g. I need a review of a builder buyer agreement for a property in Noida..."
                          className="w-full h-48 p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600 transition-colors resize-none"
                        />
                      </div>

                      <div>
                        <h4 className="font-bold mb-4">Upload Documents</h4>
                        <label className="block border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500 mb-1">Click to upload or drag & drop</p>
                          <p className="text-xs text-gray-400">PDF, DOCX, JPG supported</p>
                        </label>
                        {formData.documents.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {formData.documents.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                <FileText size={16} className="text-gray-400" />
                                <span className="text-sm flex-1">{file.name}</span>
                                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Consultation Mode */}
                {currentStep === 5 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-8">Preferred Consultation Mode</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'phone' as ConsultationMode, label: 'Phone Call', icon: Phone },
                        { id: 'video' as ConsultationMode, label: 'Video Call', icon: Video },
                        { id: 'in-person' as ConsultationMode, label: 'In-Person', icon: UserCheck }
                      ].map((mode) => {
                        const isSelected = formData.consultationMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, consultationMode: mode.id })}
                            className={`p-8 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-100'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <mode.icon size={48} className={`mx-auto mb-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <p className="font-bold">{mode.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 6: Timing & Urgency */}
                {currentStep === 6 && (
                  <div>
                    <h3 className="text-2xl font-bold mb-8">Timing & Urgency</h3>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Preferred Date
                          </label>
                          <input
                            type="date"
                            value={formData.preferredDate}
                            onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                            className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Time Window
                          </label>
                          <select
                            value={formData.preferredTime}
                            onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                            className="w-full p-4 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-600 transition-colors"
                          >
                            <option value="">Select Time</option>
                            {TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                          Urgency Level
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { id: 'standard' as UrgencyLevel, label: 'Standard (24-48 hrs)', surcharge: 0 },
                            { id: 'within-6hrs' as UrgencyLevel, label: 'Immediate (Within 6 hrs)', surcharge: 500 },
                            { id: 'within-2hrs' as UrgencyLevel, label: 'Immediate (Within 2 hrs)', surcharge: 1000 }
                          ].map((urgency) => {
                            const isSelected = formData.urgency === urgency.id;
                            return (
                              <button
                                key={urgency.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, urgency: urgency.id })}
                                className={`p-4 rounded-xl border-2 transition-all text-center ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <p className="font-semibold text-sm mb-1">{urgency.label}</p>
                                {urgency.surcharge > 0 && (
                                  <p className="text-xs text-gray-500">+₹{urgency.surcharge}</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-3">
                          Any past legal action?
                        </label>
                        <div className="flex gap-4">
                          {[
                            { value: true, label: 'Yes' },
                            { value: false, label: 'No' }
                          ].map((option) => (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => setFormData({ ...formData, pastLegalAction: option.value })}
                              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all ${
                                formData.pastLegalAction === option.value
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                formData.pastLegalAction === option.value
                                  ? 'border-blue-600'
                                  : 'border-gray-300'
                              }`}>
                                {formData.pastLegalAction === option.value && (
                                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                                )}
                              </div>
                              <span className="font-medium">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 7: Review & Confirmation */}
                {currentStep === 7 && (
                  <div>
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Ready to Submit</h3>
                      <p className="text-gray-500">
                        Your request for{' '}
                        <strong>
                          {REQUEST_WIZARD_SERVICES.find((service) => service.id === formData.services[0])
                            ?.name}
                        </strong>{' '}
                        is ready. Submit it now to create a tracked request inside your dashboard.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 space-y-4 mb-8">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Estimated Consultation Fee</span>
                        <span className="text-xl font-bold">₹ {fee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Urgency Surcharge</span>
                        <span className="text-xl font-bold">₹ {urgencySurcharge.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-lg">Total</span>
                          <span className="text-2xl font-bold">₹ {totalFee.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {submitError && (
            <div className="border-t border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 md:px-8">
              {submitError}
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 md:p-8 flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className="px-6 py-3 text-gray-400 font-bold disabled:opacity-30 hover:text-gray-600 transition-colors"
            >
              Back
            </button>
            
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={
                  isSubmitting ||
                  (currentStep === 1 && (!formData.fullName || !formData.email || !formData.mobile)) ||
                  (currentStep === 2 && formData.services.length === 0) ||
                  (currentStep === 3 && !formData.legalDomain) ||
                  (currentStep === 4 && !formData.caseDetails) ||
                  (currentStep === 6 && (!formData.preferredDate || !formData.preferredTime))
                }
                className="px-8 py-3 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'} <CheckCircle size={18} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
