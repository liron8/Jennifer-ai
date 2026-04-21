"use client";

/**
 * Executive Profile Page
 * Detailed view of an executive with tabs for different sections
 * Connected to real database via /api/executives/[id]
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail01,
  Phone01,
  MarkerPin01,
  Clock,
  Edit01,
  Briefcase01,
  Users01,
  Heart,
  Award01,
  Plus,
  Calendar,
  Plane,
  Building07,
  CreditCard01,
  RefreshCw01,
  Trash01,
  Check,
  XClose,
  MessageChatCircle,
  Shield01,
  CurrencyDollar,
} from "@untitledui/icons";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge } from "@/components/base/badges/badges";
import { NativeSelect } from "@/components/base/select/select-native";
import { InfoCard, InfoItem } from "../../_components/info-card";
import {
  type Executive,
  type DirectReport,
  type FamilyMember,
  type Membership,
  getInitials,
} from "../../_components/executive-data";
import { useExecutives, type DatabaseExecutive } from "@/hooks/useExecutives";
import { notify } from "@/lib/notifications";

// Convert database executive to UI format
const convertToUIExecutive = (dbExec: DatabaseExecutive): Executive & { home_address?: string; avatar_url?: string } => {
  return {
    id: dbExec.id,
    name: dbExec.full_name,
    preferredName: (dbExec as any).preferred_name || undefined,
    title: dbExec.title || '',
    email: dbExec.email || '',
    phone: dbExec.phone || '',
    location: dbExec.office_location || '',
    timezone: dbExec.timezone || 'America/Los_Angeles',
    department: 'Executive',
    bio: dbExec.bio || undefined,
    home_address: (dbExec as any).home_address || undefined,
    avatar_url: (dbExec as any).avatar_url || undefined,
    preferences: undefined,
  };
};

export default function ExecutiveProfilePage() {
  const params = useParams();
  const executiveId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [executive, setExecutive] = useState<Executive | null>(null);
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [rawExecData, setRawExecData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Edit profile state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', preferred_name: '', title: '', email: '', phone: '', office_location: '', home_address: '', timezone: '', bio: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Add modals state
  const [isAddDirectReportOpen, setIsAddDirectReportOpen] = useState(false);
  const [isAddFamilyMemberOpen, setIsAddFamilyMemberOpen] = useState(false);
  const [isAddMembershipOpen, setIsAddMembershipOpen] = useState(false);

  // Edit sub-entity state
  const [editingDirectReport, setEditingDirectReport] = useState<DirectReport | null>(null);
  const [editingFamilyMember, setEditingFamilyMember] = useState<FamilyMember | null>(null);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);

  // P2-08: Escalation rules
  const [escalationRules, setEscalationRules] = useState<{ id: string; rule_description: string; sort_order: number }[]>([]);
  const [newRuleText, setNewRuleText] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleText, setEditingRuleText] = useState('');

  // P2-14: Emergency contacts
  const [emergencyContacts, setEmergencyContacts] = useState<{ id: string; category: string; role: string | null; name: string; phone: string | null; email: string | null }[]>([]);
  const [isAddEmergencyOpen, setIsAddEmergencyOpen] = useState<'business' | 'personal' | null>(null);

  // Section editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [schedulingForm, setSchedulingForm] = useState({ meeting_buffer_minutes: 15, preferred_meeting_times: '' as string, max_meetings_per_day: 8 });
  const [preferencesForm, setPreferencesForm] = useState({ dietary: '', travel: '' });

  // P2-09: Archive
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // P2-06: Communication preferences
  const [communicationForm, setCommunicationForm] = useState<string[]>([]);
  // P2-07: Meeting preferences
  const [meetingPrefsForm, setMeetingPrefsForm] = useState<{ preferences: string[]; hours_start: string; hours_end: string }>({ preferences: [], hours_start: '', hours_end: '' });
  // P2-11: Travel profile
  const [travelForm, setTravelForm] = useState({
    home_airports: '', airline_preferences: '', hotel_preferences: '',
    flight_class_domestic: '', flight_class_international: '',
    seat_preference: '', rideshare_preferences: '',
    layover_preference: '', avoid_red_eye: false,
    coffee_order: '', tea_order: '', snack_preferences: '',
    dietary_restrictions: '', favorite_cuisines: '',
  });
  // P2-12/13: Religion & approval
  const [religionForm, setReligionForm] = useState('');
  const [approvalForm, setApprovalForm] = useState('');
  // P2-15: Medical
  const [medicalForm, setMedicalForm] = useState({
    carries_epipen: false, allergies: '', accessibility_needs: '',
    insurance_provider: '', insurance_plan_name: '', insurance_member_id: '',
    preferred_medical_facilities: '',
  });

  // P2-05: Multiple emails, phones, offices
  type ExecEmail = { id: string; email: string; label: string; is_primary: boolean };
  type ExecPhone = { id: string; phone: string; label: string; is_primary: boolean };
  type ExecOffice = { id: string; location_name: string; address: string | null; is_primary: boolean };
  const [execEmails, setExecEmails] = useState<ExecEmail[]>([]);
  const [execPhones, setExecPhones] = useState<ExecPhone[]>([]);
  const [execOffices, setExecOffices] = useState<ExecOffice[]>([]);

  // Fetch executive by ID
  const { getExecutive } = useExecutives();

  useEffect(() => {
    const fetchExecutive = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/executives/${executiveId}`);
        if (!response.ok) {
          throw new Error('Executive not found');
        }
        const result = await response.json();
        // Unwrap double-nesting: successResponse wraps { data: { data: {...} } }
        const execData = result.data?.data ?? result.data;
        if (execData) {
          setRawExecData(execData);
          setExecutive(convertToUIExecutive(execData));
          // Map sub-entity data from API
          if (execData.direct_reports) {
            setDirectReports(execData.direct_reports.map((dr: any) => ({
              id: dr.id,
              name: dr.full_name,
              title: dr.title || '',
              email: dr.email || '',
              department: dr.department || '',
            })));
          }
          if (execData.family_members) {
            setFamilyMembers(execData.family_members.map((fm: any) => ({
              id: fm.id,
              name: fm.full_name,
              relationship: fm.relationship,
              birthday: fm.birthday ? new Date(fm.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
              notes: fm.notes || undefined,
            })));
          }
          if (execData.memberships) {
            setMemberships(execData.memberships.map((m: any) => ({
              id: m.id,
              name: m.provider_name + (m.program_name && m.program_name !== m.provider_name ? ` ${m.program_name}` : ''),
              category: m.category as Membership['category'],
              memberNumber: m.member_number || undefined,
              tier: m.tier || undefined,
              expirationDate: m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
            })));
          }
        } else {
          throw new Error('Executive not found');
        }
      } catch (err) {
        console.error('Failed to fetch executive:', err);
        setError(err instanceof Error ? err.message : 'Failed to load executive');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSubEntities = async () => {
      try {
        const [rulesRes, emergRes, emailsRes, phonesRes, officesRes] = await Promise.all([
          fetch(`/api/executives/${executiveId}/escalation-rules`),
          fetch(`/api/executives/${executiveId}/emergency-contacts`),
          fetch(`/api/executives/${executiveId}/emails`),
          fetch(`/api/executives/${executiveId}/phones`),
          fetch(`/api/executives/${executiveId}/offices`),
        ]);
        if (rulesRes.ok) {
          const r = await rulesRes.json();
          setEscalationRules(r.data?.data ?? r.data ?? []);
        }
        if (emergRes.ok) {
          const e = await emergRes.json();
          setEmergencyContacts(e.data?.data ?? e.data ?? []);
        }
        if (emailsRes.ok) {
          const em = await emailsRes.json();
          setExecEmails(em.data?.data ?? em.data ?? []);
        }
        if (phonesRes.ok) {
          const ph = await phonesRes.json();
          setExecPhones(ph.data?.data ?? ph.data ?? []);
        }
        if (officesRes.ok) {
          const of_ = await officesRes.json();
          setExecOffices(of_.data?.data ?? of_.data ?? []);
        }
      } catch { /* ignore sub-entity fetch errors */ }
    };

    if (executiveId) {
      fetchExecutive();
      fetchSubEntities();
    }
  }, [executiveId]);

  const refetchSubEntities = useCallback(async () => {
    try {
      const [rulesRes, emergRes, emailsRes, phonesRes, officesRes] = await Promise.all([
        fetch(`/api/executives/${executiveId}/escalation-rules`),
        fetch(`/api/executives/${executiveId}/emergency-contacts`),
        fetch(`/api/executives/${executiveId}/emails`),
        fetch(`/api/executives/${executiveId}/phones`),
        fetch(`/api/executives/${executiveId}/offices`),
      ]);
      if (rulesRes.ok) {
        const r = await rulesRes.json();
        setEscalationRules(r.data?.data ?? r.data ?? []);
      }
      if (emergRes.ok) {
        const e = await emergRes.json();
        setEmergencyContacts(e.data?.data ?? e.data ?? []);
      }
      if (emailsRes.ok) {
        const em = await emailsRes.json();
        setExecEmails(em.data?.data ?? em.data ?? []);
      }
      if (phonesRes.ok) {
        const ph = await phonesRes.json();
        setExecPhones(ph.data?.data ?? ph.data ?? []);
      }
      if (officesRes.ok) {
        const of_ = await officesRes.json();
        setExecOffices(of_.data?.data ?? of_.data ?? []);
      }
    } catch { /* ignore */ }
  }, [executiveId]);

  const refetchExecutive = useCallback(async () => {
    try {
      const response = await fetch(`/api/executives/${executiveId}`);
      if (!response.ok) return;
      const result = await response.json();
      const execData = result.data?.data ?? result.data;
      if (execData) {
        setRawExecData(execData);
        setExecutive(convertToUIExecutive(execData));
        if (execData.direct_reports) {
          setDirectReports(execData.direct_reports.map((dr: any) => ({
            id: dr.id, name: dr.full_name, title: dr.title || '', email: dr.email || '', department: dr.department || '',
          })));
        }
        if (execData.family_members) {
          setFamilyMembers(execData.family_members.map((fm: any) => ({
            id: fm.id, name: fm.full_name, relationship: fm.relationship,
            birthday: fm.birthday ? new Date(fm.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
            notes: fm.notes || undefined,
          })));
        }
        if (execData.memberships) {
          setMemberships(execData.memberships.map((m: any) => ({
            id: m.id,
            name: m.provider_name + (m.program_name && m.program_name !== m.provider_name ? ` ${m.program_name}` : ''),
            category: m.category as Membership['category'],
            memberNumber: m.member_number || undefined,
            tier: m.tier || undefined,
            expirationDate: m.expires_at ? new Date(m.expires_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
          })));
        }
      }
    } catch (err) {
      console.error('Failed to refetch executive:', err);
    }
  }, [executiveId]);

  // Edit Profile handlers
  const openEditProfile = () => {
    if (!executive) return;
    setEditForm({
      full_name: executive.name,
      preferred_name: executive.preferredName || '',
      title: executive.title,
      email: executive.email,
      phone: executive.phone,
      office_location: executive.location,
      home_address: (executive as any)?.home_address || '',
      timezone: executive.timezone,
      bio: executive.bio || '',
    });
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/executives/${executiveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editForm.full_name,
          preferred_name: editForm.preferred_name || null,
          title: editForm.title || null,
          email: editForm.email || null,
          phones: editForm.phone ? [{ number: editForm.phone, type: 'mobile', is_primary: true }] : [],
          main_office_location: editForm.office_location || null,
          home_address: editForm.home_address || null,
          timezone: editForm.timezone || null,
          bio: editForm.bio || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      notify.success('Profile updated', 'Executive profile has been saved.');
      setIsEditProfileOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Add Stakeholder handler
  const handleAddDirectReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/direct-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          title: fd.get('title') || undefined,
          department: fd.get('department') || undefined,
          email: fd.get('email') || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to add direct report');
      notify.success('Stakeholder added', 'The stakeholder has been added.');
      setIsAddDirectReportOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to add direct report.');
    }
  };

  // Add Family Member handler
  const handleAddFamilyMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/family-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          relationship: fd.get('relationship'),
          birthday: fd.get('birthday') || undefined,
          notes: fd.get('notes') || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to add family member');
      notify.success('Family member added', 'The family member has been added.');
      setIsAddFamilyMemberOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to add family member.');
    }
  };

  // Add Membership handler
  const handleAddMembership = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: fd.get('category'),
          provider_name: fd.get('provider_name'),
          program_name: fd.get('program_name') || undefined,
          member_number: fd.get('member_number') || undefined,
          tier: fd.get('tier') || undefined,
          expires_at: fd.get('expires_at') || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to add membership');
      notify.success('Membership added', 'The membership has been added.');
      setIsAddMembershipOpen(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to add membership.');
    }
  };

  // Edit Stakeholder handler
  const handleEditDirectReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDirectReport) return;
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/direct-reports/${editingDirectReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          title: fd.get('title') || null,
          department: fd.get('department') || null,
          email: fd.get('email') || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update direct report');
      notify.success('Stakeholder updated', 'Changes have been saved.');
      setEditingDirectReport(null);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update.');
    }
  };

  // Delete Direct Report handler
  const handleDeleteDirectReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/executives/${executiveId}/direct-reports/${reportId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete direct report');
      notify.success('Deleted', 'Stakeholder has been removed.');
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to delete.');
    }
  };

  // Edit Family Member handler
  const handleEditFamilyMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingFamilyMember) return;
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/family-members/${editingFamilyMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          relationship: fd.get('relationship'),
          birthday: fd.get('birthday') || null,
          notes: fd.get('notes') || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update family member');
      notify.success('Family member updated', 'Changes have been saved.');
      setEditingFamilyMember(null);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update.');
    }
  };

  // Delete Family Member handler
  const handleDeleteFamilyMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/executives/${executiveId}/family-members/${memberId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete family member');
      notify.success('Deleted', 'Family member has been removed.');
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to delete.');
    }
  };

  // Edit Membership handler
  const handleEditMembership = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMembership) return;
    // Find the raw membership data to get DB fields
    const rawMembership = rawExecData?.memberships?.find((m: any) => m.id === editingMembership.id);
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/memberships/${editingMembership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: fd.get('category'),
          provider_name: fd.get('provider_name'),
          program_name: fd.get('program_name') || null,
          member_number: fd.get('member_number') || null,
          tier: fd.get('tier') || null,
          expires_at: fd.get('expires_at') || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to update membership');
      notify.success('Membership updated', 'Changes have been saved.');
      setEditingMembership(null);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update.');
    }
  };

  // Delete Membership handler
  const handleDeleteMembership = async (membershipId: string) => {
    try {
      const response = await fetch(`/api/executives/${executiveId}/memberships/${membershipId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete membership');
      notify.success('Deleted', 'Membership has been removed.');
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to delete.');
    }
  };

  // Open section edit with current values
  const openSectionEdit = (section: string) => {
    if (section === 'scheduling') {
      const prefs = rawExecData?.scheduling_preferences || {};
      setSchedulingForm({
        meeting_buffer_minutes: prefs.meeting_buffer_minutes ?? 15,
        preferred_meeting_times: (prefs.preferred_meeting_times || []).join(', '),
        max_meetings_per_day: prefs.max_meetings_per_day ?? 8,
      });
    } else if (section === 'preferences') {
      const dietary = rawExecData?.dietary_preferences || {};
      const travel = rawExecData?.travel_preferences || {};
      setPreferencesForm({
        dietary: [
          ...(dietary.restrictions || []),
          ...(dietary.allergies || []),
          dietary.notes,
        ].filter(Boolean).join(', ') || '',
        travel: [
          travel.seat_preference !== 'no_preference' ? `Seat: ${travel.seat_preference}` : '',
          travel.class_preference !== 'economy' ? `Class: ${travel.class_preference}` : '',
          ...(travel.preferred_airlines || []),
        ].filter(Boolean).join(', ') || '',
      });
    } else if (section === 'communication') {
      setCommunicationForm(rawExecData?.communication_preferences || []);
    } else if (section === 'meeting') {
      setMeetingPrefsForm({
        preferences: rawExecData?.meeting_preferences || [],
        hours_start: rawExecData?.typical_meeting_hours_start || '',
        hours_end: rawExecData?.typical_meeting_hours_end || '',
      });
    } else if (section === 'travel') {
      setTravelForm({
        home_airports: (rawExecData?.home_airports || []).join(', '),
        airline_preferences: (rawExecData?.airline_preferences || []).join(', '),
        hotel_preferences: (rawExecData?.hotel_preferences || []).join(', '),
        flight_class_domestic: rawExecData?.flight_class_domestic || '',
        flight_class_international: rawExecData?.flight_class_international || '',
        seat_preference: rawExecData?.seat_preference || '',
        rideshare_preferences: (rawExecData?.rideshare_preferences || []).join(', '),
        layover_preference: rawExecData?.layover_preference || '',
        avoid_red_eye: rawExecData?.avoid_red_eye || false,
        coffee_order: rawExecData?.coffee_order || '',
        tea_order: rawExecData?.tea_order || '',
        snack_preferences: rawExecData?.snack_preferences || '',
        dietary_restrictions: (rawExecData?.dietary_restrictions || []).join(', '),
        favorite_cuisines: (rawExecData?.favorite_cuisines || []).join(', '),
      });
    } else if (section === 'personal') {
      setReligionForm(rawExecData?.religion || '');
      setApprovalForm(rawExecData?.approval_threshold != null ? String(rawExecData.approval_threshold) : '');
    } else if (section === 'medical') {
      setMedicalForm({
        carries_epipen: rawExecData?.carries_epipen || false,
        allergies: (rawExecData?.allergies || []).join(', '),
        accessibility_needs: rawExecData?.accessibility_needs || '',
        insurance_provider: rawExecData?.insurance_provider || '',
        insurance_plan_name: rawExecData?.insurance_plan_name || '',
        insurance_member_id: rawExecData?.insurance_member_id_encrypted || '',
        preferred_medical_facilities: rawExecData?.preferred_medical_facilities || '',
      });
    }
    setEditingSection(section);
  };

  // Save section preferences
  const handleSaveSection = async (section: string) => {
    try {
      let payload: Record<string, unknown> = {};
      if (section === 'scheduling') {
        payload.scheduling_preferences = {
          meeting_buffer_minutes: schedulingForm.meeting_buffer_minutes,
          preferred_meeting_times: schedulingForm.preferred_meeting_times
            .split(',').map(s => s.trim()).filter(Boolean),
          max_meetings_per_day: schedulingForm.max_meetings_per_day,
        };
      } else if (section === 'preferences') {
        payload.dietary_preferences = {
          restrictions: preferencesForm.dietary.split(',').map(s => s.trim()).filter(Boolean),
        };
        payload.travel_preferences = {
          preferred_airlines: preferencesForm.travel.split(',').map(s => s.trim()).filter(Boolean),
        };
      } else if (section === 'communication') {
        payload.communication_preferences = communicationForm;
      } else if (section === 'meeting') {
        payload.meeting_preferences = meetingPrefsForm.preferences;
        payload.typical_meeting_hours_start = meetingPrefsForm.hours_start || null;
        payload.typical_meeting_hours_end = meetingPrefsForm.hours_end || null;
      } else if (section === 'travel') {
        payload.home_airports = travelForm.home_airports.split(',').map(s => s.trim()).filter(Boolean);
        payload.airline_preferences = travelForm.airline_preferences.split(',').map(s => s.trim()).filter(Boolean);
        payload.hotel_preferences = travelForm.hotel_preferences.split(',').map(s => s.trim()).filter(Boolean);
        payload.flight_class_domestic = travelForm.flight_class_domestic || null;
        payload.flight_class_international = travelForm.flight_class_international || null;
        payload.seat_preference = travelForm.seat_preference || null;
        payload.rideshare_preferences = travelForm.rideshare_preferences.split(',').map(s => s.trim()).filter(Boolean);
        payload.layover_preference = travelForm.layover_preference || null;
        payload.avoid_red_eye = travelForm.avoid_red_eye;
        payload.dietary_restrictions = travelForm.dietary_restrictions.split(',').map(s => s.trim()).filter(Boolean);
        payload.favorite_cuisines = travelForm.favorite_cuisines.split(',').map(s => s.trim()).filter(Boolean);
        payload.coffee_order = travelForm.coffee_order || null;
        payload.tea_order = travelForm.tea_order || null;
        payload.snack_preferences = travelForm.snack_preferences || null;
      } else if (section === 'personal') {
        payload.religion = religionForm || null;
        payload.approval_threshold = approvalForm ? parseFloat(approvalForm) : null;
      } else if (section === 'medical') {
        payload.carries_epipen = medicalForm.carries_epipen;
        payload.allergies = medicalForm.allergies.split(',').map(s => s.trim()).filter(Boolean);
        payload.accessibility_needs = medicalForm.accessibility_needs || null;
        payload.insurance_provider = medicalForm.insurance_provider || null;
        payload.insurance_plan_name = medicalForm.insurance_plan_name || null;
        payload.insurance_member_id_encrypted = medicalForm.insurance_member_id || null;
        payload.preferred_medical_facilities = medicalForm.preferred_medical_facilities || null;
      }
      const response = await fetch(`/api/executives/${executiveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      notify.success('Preferences updated', 'Changes have been saved.');
      setEditingSection(null);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update.');
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch(`/api/executives/${executiveId}/avatar`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload avatar');
      const result = await response.json();
      const avatarUrl = result.data?.avatar_url || result.data?.data?.avatar_url;
      if (avatarUrl && executive) {
        setExecutive({ ...executive, avatar_url: avatarUrl } as any);
      }
      notify.success('Avatar updated', 'Profile picture has been updated.');
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to upload avatar.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // P2-09: Archive/Unarchive handler
  const handleArchiveToggle = async () => {
    setIsArchiving(true);
    try {
      const isArchived = !!rawExecData?.archived_at;
      const response = await fetch(`/api/executives/${executiveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived_at: isArchived ? null : new Date().toISOString() }),
      });
      if (!response.ok) throw new Error('Failed to update archive status');
      notify.success(isArchived ? 'Profile unarchived' : 'Profile archived', isArchived ? 'Executive is now active.' : 'Executive has been archived.');
      setShowArchiveConfirm(false);
      refetchExecutive();
    } catch (err) {
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update archive status.');
    } finally {
      setIsArchiving(false);
    }
  };

  // P2-08: Escalation rule CRUD
  const handleAddRule = async () => {
    const trimmed = newRuleText.trim();
    if (!trimmed) return;
    try {
      const response = await fetch(`/api/executives/${executiveId}/escalation-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_description: trimmed, sort_order: escalationRules.length }),
      });
      if (!response.ok) throw new Error('Failed to add rule');
      setNewRuleText('');
      refetchSubEntities();
    } catch (err) {
      notify.error('Error', 'Failed to add escalation rule.');
    }
  };

  const handleSaveRuleEdit = async () => {
    if (!editingRuleId || !editingRuleText.trim()) { setEditingRuleId(null); return; }
    try {
      await fetch(`/api/executives/${executiveId}/escalation-rules/${editingRuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_description: editingRuleText.trim() }),
      });
      setEditingRuleId(null);
      refetchSubEntities();
    } catch { notify.error('Error', 'Failed to update rule.'); }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await fetch(`/api/executives/${executiveId}/escalation-rules/${ruleId}`, { method: 'DELETE' });
      refetchSubEntities();
    } catch { notify.error('Error', 'Failed to delete rule.'); }
  };

  // P2-14: Emergency contact CRUD
  const handleAddEmergencyContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const response = await fetch(`/api/executives/${executiveId}/emergency-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: isAddEmergencyOpen,
          role: fd.get('role') || undefined,
          name: fd.get('name'),
          phone: fd.get('phone') || undefined,
          email: fd.get('email') || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to add emergency contact');
      notify.success('Emergency contact added', 'The contact has been added.');
      setIsAddEmergencyOpen(null);
      refetchSubEntities();
    } catch (err) {
      notify.error('Error', 'Failed to add emergency contact.');
    }
  };

  const handleDeleteEmergencyContact = async (contactId: string) => {
    try {
      await fetch(`/api/executives/${executiveId}/emergency-contacts/${contactId}`, { method: 'DELETE' });
      refetchSubEntities();
      notify.success('Deleted', 'Emergency contact removed.');
    } catch { notify.error('Error', 'Failed to delete emergency contact.'); }
  };

  const getMembershipIcon = (category: string) => {
    switch (category) {
      case "airlines": return Plane;
      case "hotels": return Building07;
      case "lounges": return Briefcase01;
      default: return CreditCard01;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <Link
          href="/team/executives"
          className="inline-flex items-center gap-2 text-sm text-tertiary hover:text-primary w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Executives
        </Link>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-tertiary">Loading executive profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !executive) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-8">
        <Link
          href="/team/executives"
          className="inline-flex items-center gap-2 text-sm text-tertiary hover:text-primary w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Executives
        </Link>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-semibold text-primary">Unable to load executive</p>
            <p className="text-sm text-tertiary max-w-md">{error || 'Executive not found'}</p>
            <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      {/* Back Button */}
      <Link
        href="/team/executives"
        className="inline-flex items-center gap-2 text-sm text-tertiary hover:text-primary w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Executives
      </Link>

      {/* Profile Header */}
      <div className="rounded-xl border border-secondary bg-primary p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <Avatar
              src={(executive as any).avatar_url || undefined}
              initials={getInitials(executive.name)}
              alt={executive.name}
              size="2xl"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Edit01 className="h-5 w-5 text-white" />
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-primary lg:text-2xl">
                  {executive.name}
                  {executive.preferredName && (
                    <span className="ml-2 text-base font-normal text-tertiary">({executive.preferredName})</span>
                  )}
                </h1>
                <p className="text-sm text-tertiary">{executive.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge color="gray" type="pill-color" size="sm">
                    {executive.department}
                  </Badge>
                  {rawExecData?.archived_at && (
                    <Badge color="warning" type="pill-color" size="sm">Archived</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="md" color="secondary" iconLeading={Edit01} onClick={openEditProfile}>
                  Edit Profile
                </Button>
                {rawExecData?.archived_at ? (
                  <Button size="md" color="secondary" onClick={() => handleArchiveToggle()}>
                    Unarchive
                  </Button>
                ) : (
                  <Button size="md" color="secondary" className="text-warning-700" onClick={() => setShowArchiveConfirm(true)}>
                    Archive
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Mail01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{execEmails.find(e => e.is_primary)?.email || executive.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{execPhones.find(p => p.is_primary)?.phone || executive.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MarkerPin01 className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{execOffices.find(o => o.is_primary)?.location_name || executive.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-fg-quaternary" />
                <span className="text-sm text-secondary">{executive.timezone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
        <TabList
          type="button-minimal"
          items={[
            { id: "overview", label: "Overview" },
            { id: "direct-reports", label: "Stakeholders & Team" },
            { id: "family", label: "Family" },
            { id: "memberships", label: "Memberships" },
          ]}
        />
      </Tabs>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <InfoCard title="About">
            <p className="text-sm text-secondary">{executive.bio || "No bio available."}</p>
          </InfoCard>

          <InfoCard title="Contact Information">
            <div className="space-y-4">
              {/* Emails */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Emails</span>
                  <button
                    onClick={async () => {
                      const email = prompt('Enter email address:');
                      if (!email) return;
                      const label = prompt('Label (work, personal, other):', 'work') || 'work';
                      try {
                        const res = await fetch(`/api/executives/${executiveId}/emails`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email, label, is_primary: execEmails.length === 0 }),
                        });
                        if (res.ok) { refetchSubEntities(); notify.success('Email added'); }
                        else { const err = await res.json(); notify.error('Failed', err.error?.message || 'Could not add email'); }
                      } catch { notify.error('Failed to add email'); }
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >+ Add</button>
                </div>
                {execEmails.length > 0 ? execEmails.map(em => (
                  <div key={em.id} className="group flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Mail01 className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{em.email}</span>
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400 capitalize">{em.label}</span>
                      {em.is_primary && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">Primary</span>}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`/api/executives/${executiveId}/emails`, {
                            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: em.id }),
                          });
                          refetchSubEntities();
                        } catch {}
                      }}
                      className="hidden group-hover:block rounded p-0.5 text-gray-400 hover:text-error-500"
                    ><Trash01 className="h-3.5 w-3.5" /></button>
                  </div>
                )) : (
                  <InfoItem label="Email" value={executive.email} />
                )}
              </div>

              {/* Phones */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phones</span>
                  <button
                    onClick={async () => {
                      const phone = prompt('Enter phone number:');
                      if (!phone) return;
                      const label = prompt('Label (office, mobile, home, other):', 'office') || 'office';
                      try {
                        const res = await fetch(`/api/executives/${executiveId}/phones`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ phone, label, is_primary: execPhones.length === 0 }),
                        });
                        if (res.ok) { refetchSubEntities(); notify.success('Phone added'); }
                        else { notify.error('Failed to add phone'); }
                      } catch { notify.error('Failed to add phone'); }
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >+ Add</button>
                </div>
                {execPhones.length > 0 ? execPhones.map(ph => (
                  <div key={ph.id} className="group flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Phone01 className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{ph.phone}</span>
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400 capitalize">{ph.label}</span>
                      {ph.is_primary && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">Primary</span>}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`/api/executives/${executiveId}/phones`, {
                            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: ph.id }),
                          });
                          refetchSubEntities();
                        } catch {}
                      }}
                      className="hidden group-hover:block rounded p-0.5 text-gray-400 hover:text-error-500"
                    ><Trash01 className="h-3.5 w-3.5" /></button>
                  </div>
                )) : (
                  <InfoItem label="Phone" value={executive.phone} />
                )}
              </div>

              {/* Offices */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offices</span>
                  <button
                    onClick={async () => {
                      const location_name = prompt('Office name (e.g., HQ, Remote, Downtown):');
                      if (!location_name) return;
                      const address = prompt('Address (optional):') || undefined;
                      try {
                        const res = await fetch(`/api/executives/${executiveId}/offices`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ location_name, address, is_primary: execOffices.length === 0 }),
                        });
                        if (res.ok) { refetchSubEntities(); notify.success('Office added'); }
                        else { notify.error('Failed to add office'); }
                      } catch { notify.error('Failed to add office'); }
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >+ Add</button>
                </div>
                {execOffices.length > 0 ? execOffices.map(of_ => (
                  <div key={of_.id} className="group flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <MarkerPin01 className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{of_.location_name}</span>
                      {of_.address && <span className="text-xs text-gray-400">({of_.address})</span>}
                      {of_.is_primary && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">Primary</span>}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`/api/executives/${executiveId}/offices`, {
                            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: of_.id }),
                          });
                          refetchSubEntities();
                        } catch {}
                      }}
                      className="hidden group-hover:block rounded p-0.5 text-gray-400 hover:text-error-500"
                    ><Trash01 className="h-3.5 w-3.5" /></button>
                  </div>
                )) : (
                  <InfoItem label="Office" value={executive.location} />
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
                <InfoItem label="Home Address" value={(executive as any).home_address || 'Not set'} />
                <InfoItem label="Timezone" value={executive.timezone} />
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="Scheduling Preferences"
            action={
              editingSection === 'scheduling' ? (
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" iconLeading={XClose} onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" color="primary" iconLeading={Check} onClick={() => handleSaveSection('scheduling')}>Save</Button>
                </div>
              ) : (
                <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => openSectionEdit('scheduling')}>Edit</Button>
              )
            }
          >
            {editingSection === 'scheduling' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Meeting Buffer (minutes)</label>
                  <input type="number" min={0} max={120} value={schedulingForm.meeting_buffer_minutes} onChange={(e) => setSchedulingForm(prev => ({ ...prev, meeting_buffer_minutes: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Preferred Meeting Times (comma-separated)</label>
                  <input value={schedulingForm.preferred_meeting_times} onChange={(e) => setSchedulingForm(prev => ({ ...prev, preferred_meeting_times: e.target.value }))} placeholder="e.g., Morning, After 2pm" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Max Meetings Per Day</label>
                  <input type="number" min={1} max={20} value={schedulingForm.max_meetings_per_day} onChange={(e) => setSchedulingForm(prev => ({ ...prev, max_meetings_per_day: parseInt(e.target.value) || 1 }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-tertiary">Meeting Buffer</p>
                  <p className="text-sm font-medium text-primary">{rawExecData?.scheduling_preferences?.meeting_buffer_minutes ?? executive.preferences?.meetingBuffer ?? 15} minutes</p>
                </div>
                <div>
                  <p className="text-xs text-tertiary">Max Meetings/Day</p>
                  <p className="text-sm font-medium text-primary">{rawExecData?.scheduling_preferences?.max_meetings_per_day ?? 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-tertiary mb-1">Preferred Meeting Times</p>
                  <div className="flex flex-wrap gap-2">
                    {(rawExecData?.scheduling_preferences?.preferred_meeting_times || executive.preferences?.preferredMeetingTimes || []).length > 0 ? (
                      (rawExecData?.scheduling_preferences?.preferred_meeting_times || executive.preferences?.preferredMeetingTimes || []).map((time: string, i: number) => (
                        <Badge key={i} color="gray" type="pill-color" size="sm">{time}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-tertiary">None set</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </InfoCard>

          <InfoCard
            title="Other Preferences"
            action={
              editingSection === 'preferences' ? (
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" iconLeading={XClose} onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" color="primary" iconLeading={Check} onClick={() => handleSaveSection('preferences')}>Save</Button>
                </div>
              ) : (
                <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => openSectionEdit('preferences')}>Edit</Button>
              )
            }
          >
            {editingSection === 'preferences' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Dietary Restrictions/Notes (comma-separated)</label>
                  <input value={preferencesForm.dietary} onChange={(e) => setPreferencesForm(prev => ({ ...prev, dietary: e.target.value }))} placeholder="e.g., Vegetarian, No nuts" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Travel Preferences (comma-separated)</label>
                  <input value={preferencesForm.travel} onChange={(e) => setPreferencesForm(prev => ({ ...prev, travel: e.target.value }))} placeholder="e.g., Window seat, Business class, United" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
            ) : (
              <div className="space-y-1 divide-y divide-secondary">
                <InfoItem label="Dietary" value={
                  (() => {
                    const d = rawExecData?.dietary_preferences;
                    const items = [...(d?.restrictions || []), ...(d?.allergies || [])].filter(Boolean);
                    return items.length > 0 ? items.join(', ') : (d?.notes || executive.preferences?.dietary || "None specified");
                  })()
                } />
                <InfoItem label="Travel" value={
                  (() => {
                    const t = rawExecData?.travel_preferences;
                    const items = [...(t?.preferred_airlines || [])].filter(Boolean);
                    const extras = [
                      t?.seat_preference && t.seat_preference !== 'no_preference' ? `Seat: ${t.seat_preference}` : '',
                      t?.class_preference && t.class_preference !== 'economy' ? `Class: ${t.class_preference}` : '',
                    ].filter(Boolean);
                    const all = [...items, ...extras];
                    return all.length > 0 ? all.join(', ') : (executive.preferences?.travel || "None specified");
                  })()
                } />
              </div>
            )}
          </InfoCard>

          {/* P2-06: Communication Preferences */}
          <InfoCard
            title="Communication Preferences"
            action={
              editingSection === 'communication' ? (
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" iconLeading={XClose} onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" color="primary" iconLeading={Check} onClick={() => handleSaveSection('communication')}>Save</Button>
                </div>
              ) : (
                <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => openSectionEdit('communication')}>Edit</Button>
              )
            }
          >
            {editingSection === 'communication' ? (
              <div className="flex flex-wrap gap-2">
                {['Email', 'Phone', 'Text/SMS', 'Slack', 'In-Person', 'Video Call'].map(method => (
                  <label key={method} className="flex items-center gap-2 rounded-lg border border-secondary px-3 py-2 cursor-pointer hover:bg-secondary/50">
                    <input type="checkbox" checked={communicationForm.includes(method)} onChange={(e) => {
                      setCommunicationForm(prev => e.target.checked ? [...prev, method] : prev.filter(m => m !== method));
                    }} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-primary">{method}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(rawExecData?.communication_preferences || []).length > 0 ? (
                  (rawExecData?.communication_preferences || []).map((pref: string, i: number) => (
                    <Badge key={i} color="brand" type="pill-color" size="sm">{pref}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-tertiary">No preferences set</p>
                )}
              </div>
            )}
          </InfoCard>

          {/* P2-07: Meeting Preferences */}
          <InfoCard
            title="Meeting Preferences"
            action={
              editingSection === 'meeting' ? (
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" iconLeading={XClose} onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" color="primary" iconLeading={Check} onClick={() => handleSaveSection('meeting')}>Save</Button>
                </div>
              ) : (
                <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => openSectionEdit('meeting')}>Edit</Button>
              )
            }
          >
            {editingSection === 'meeting' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-tertiary mb-2 block">Meeting Style Preferences</label>
                  <div className="flex flex-wrap gap-2">
                    {['Agenda required', 'Prefer short meetings', 'Walking meetings', 'No back-to-back', 'Buffer between calls', 'Morning meetings only', 'No meetings Friday PM'].map(pref => (
                      <label key={pref} className="flex items-center gap-2 rounded-lg border border-secondary px-3 py-2 cursor-pointer hover:bg-secondary/50">
                        <input type="checkbox" checked={meetingPrefsForm.preferences.includes(pref)} onChange={(e) => {
                          setMeetingPrefsForm(prev => ({
                            ...prev,
                            preferences: e.target.checked ? [...prev.preferences, pref] : prev.preferences.filter(p => p !== pref),
                          }));
                        }} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                        <span className="text-sm text-primary">{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Typical Hours Start</label>
                    <input type="time" value={meetingPrefsForm.hours_start} onChange={(e) => setMeetingPrefsForm(prev => ({ ...prev, hours_start: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Typical Hours End</label>
                    <input type="time" value={meetingPrefsForm.hours_end} onChange={(e) => setMeetingPrefsForm(prev => ({ ...prev, hours_end: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-tertiary mb-1">Meeting Style</p>
                  <div className="flex flex-wrap gap-2">
                    {(rawExecData?.meeting_preferences || []).length > 0 ? (
                      (rawExecData?.meeting_preferences || []).map((pref: string, i: number) => (
                        <Badge key={i} color="gray" type="pill-color" size="sm">{pref}</Badge>
                      ))
                    ) : (
                      <p className="text-sm text-tertiary">None set</p>
                    )}
                  </div>
                </div>
                {(rawExecData?.typical_meeting_hours_start || rawExecData?.typical_meeting_hours_end) && (
                  <div>
                    <p className="text-xs text-tertiary">Typical Meeting Hours</p>
                    <p className="text-sm font-medium text-primary">
                      {rawExecData?.typical_meeting_hours_start || '?'} – {rawExecData?.typical_meeting_hours_end || '?'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </InfoCard>

          {/* P2-11: Travel Profile */}
          <InfoCard
            title="Travel Profile"
            action={
              editingSection === 'travel' ? (
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" iconLeading={XClose} onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" color="primary" iconLeading={Check} onClick={() => handleSaveSection('travel')}>Save</Button>
                </div>
              ) : (
                <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => openSectionEdit('travel')}>Edit</Button>
              )
            }
          >
            {editingSection === 'travel' ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Home Airports (comma-separated)</label>
                    <input value={travelForm.home_airports} onChange={(e) => setTravelForm(prev => ({ ...prev, home_airports: e.target.value }))} placeholder="LAX, BUR" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Preferred Airlines</label>
                    <input value={travelForm.airline_preferences} onChange={(e) => setTravelForm(prev => ({ ...prev, airline_preferences: e.target.value }))} placeholder="United, Delta" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Hotel Preferences</label>
                    <input value={travelForm.hotel_preferences} onChange={(e) => setTravelForm(prev => ({ ...prev, hotel_preferences: e.target.value }))} placeholder="Marriott, Ritz-Carlton" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Seat Preference</label>
                    <NativeSelect size="sm" value={travelForm.seat_preference} onChange={(e) => setTravelForm(prev => ({ ...prev, seat_preference: e.target.value }))} options={[
                      { label: "No preference", value: "" },
                      { label: "Window", value: "window" },
                      { label: "Aisle", value: "aisle" },
                    ]} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Domestic Flight Class</label>
                    <NativeSelect size="sm" value={travelForm.flight_class_domestic} onChange={(e) => setTravelForm(prev => ({ ...prev, flight_class_domestic: e.target.value }))} options={[
                      { label: "No preference", value: "" },
                      { label: "Economy", value: "economy" },
                      { label: "Premium Economy", value: "premium_economy" },
                      { label: "Business", value: "business" },
                      { label: "First", value: "first" },
                    ]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">International Flight Class</label>
                    <NativeSelect size="sm" value={travelForm.flight_class_international} onChange={(e) => setTravelForm(prev => ({ ...prev, flight_class_international: e.target.value }))} options={[
                      { label: "No preference", value: "" },
                      { label: "Economy", value: "economy" },
                      { label: "Premium Economy", value: "premium_economy" },
                      { label: "Business", value: "business" },
                      { label: "First", value: "first" },
                    ]} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Rideshare Preferences</label>
                    <input value={travelForm.rideshare_preferences} onChange={(e) => setTravelForm(prev => ({ ...prev, rideshare_preferences: e.target.value }))} placeholder="Uber Black, Lyft" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-tertiary">Layover Preference</label>
                    <NativeSelect size="sm" value={travelForm.layover_preference} onChange={(e) => setTravelForm(prev => ({ ...prev, layover_preference: e.target.value }))} options={[
                      { label: "No preference", value: "" },
                      { label: "Direct flights only", value: "direct_only" },
                      { label: "Short layovers OK", value: "short_ok" },
                      { label: "Any layover fine", value: "any" },
                    ]} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={travelForm.avoid_red_eye} onChange={(e) => setTravelForm(prev => ({ ...prev, avoid_red_eye: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-primary">Avoid red-eye flights</span>
                </label>
                <div className="border-t border-secondary pt-4">
                  <p className="text-xs font-medium text-tertiary mb-3">Dining & Beverage Preferences</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Dietary Restrictions</label>
                      <input value={travelForm.dietary_restrictions} onChange={(e) => setTravelForm(prev => ({ ...prev, dietary_restrictions: e.target.value }))} placeholder="Vegetarian, Gluten-free" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Favorite Cuisines</label>
                      <input value={travelForm.favorite_cuisines} onChange={(e) => setTravelForm(prev => ({ ...prev, favorite_cuisines: e.target.value }))} placeholder="Italian, Japanese" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Coffee Order</label>
                      <input value={travelForm.coffee_order} onChange={(e) => setTravelForm(prev => ({ ...prev, coffee_order: e.target.value }))} placeholder="Oat milk latte, no sugar" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Tea Order</label>
                      <input value={travelForm.tea_order} onChange={(e) => setTravelForm(prev => ({ ...prev, tea_order: e.target.value }))} placeholder="Earl Grey, no milk" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-4">
                    <label className="text-xs font-medium text-tertiary">Snack Preferences</label>
                    <input value={travelForm.snack_preferences} onChange={(e) => setTravelForm(prev => ({ ...prev, snack_preferences: e.target.value }))} placeholder="Dark chocolate, mixed nuts" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-tertiary">Home Airports</p>
                    <p className="text-sm font-medium text-primary">{(rawExecData?.home_airports || []).join(', ') || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary">Seat Preference</p>
                    <p className="text-sm font-medium text-primary capitalize">{rawExecData?.seat_preference || 'Not set'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-tertiary">Domestic Class</p>
                    <p className="text-sm font-medium text-primary capitalize">{rawExecData?.flight_class_domestic?.replace('_', ' ') || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-tertiary">International Class</p>
                    <p className="text-sm font-medium text-primary capitalize">{rawExecData?.flight_class_international?.replace('_', ' ') || 'Not set'}</p>
                  </div>
                </div>
                {(rawExecData?.airline_preferences || []).length > 0 && (
                  <div>
                    <p className="text-xs text-tertiary mb-1">Preferred Airlines</p>
                    <div className="flex flex-wrap gap-2">{(rawExecData.airline_preferences || []).map((a: string, i: number) => <Badge key={i} color="gray" type="pill-color" size="sm">{a}</Badge>)}</div>
                  </div>
                )}
                {(rawExecData?.hotel_preferences || []).length > 0 && (
                  <div>
                    <p className="text-xs text-tertiary mb-1">Preferred Hotels</p>
                    <div className="flex flex-wrap gap-2">{(rawExecData.hotel_preferences || []).map((h: string, i: number) => <Badge key={i} color="gray" type="pill-color" size="sm">{h}</Badge>)}</div>
                  </div>
                )}
                {rawExecData?.avoid_red_eye && <p className="text-xs text-tertiary">Avoids red-eye flights</p>}
                {(rawExecData?.coffee_order || rawExecData?.tea_order) && (
                  <div className="border-t border-secondary pt-3 grid grid-cols-2 gap-4">
                    {rawExecData?.coffee_order && <div><p className="text-xs text-tertiary">Coffee Order</p><p className="text-sm text-primary">{rawExecData.coffee_order}</p></div>}
                    {rawExecData?.tea_order && <div><p className="text-xs text-tertiary">Tea Order</p><p className="text-sm text-primary">{rawExecData.tea_order}</p></div>}
                  </div>
                )}
              </div>
            )}
          </InfoCard>

          {/* P2-12/13: Personal & Business Settings */}
          <InfoCard
            title="Personal & Business"
            action={
              editingSection === 'personal' ? (
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" iconLeading={XClose} onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" color="primary" iconLeading={Check} onClick={() => handleSaveSection('personal')}>Save</Button>
                </div>
              ) : (
                <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => openSectionEdit('personal')}>Edit</Button>
              )
            }
          >
            {editingSection === 'personal' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Religion</label>
                  <input value={religionForm} onChange={(e) => setReligionForm(e.target.value)} placeholder="e.g., Christian, Jewish, Muslim, Buddhist" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Approval Threshold ($)</label>
                  <input type="number" min={0} step={100} value={approvalForm} onChange={(e) => setApprovalForm(e.target.value)} placeholder="e.g., 5000" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  <p className="text-xs text-tertiary">Expenses above this amount require executive approval</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 divide-y divide-secondary">
                <InfoItem label="Religion" value={rawExecData?.religion || 'Not set'} />
                <InfoItem label="Approval Threshold" value={rawExecData?.approval_threshold != null ? `$${Number(rawExecData.approval_threshold).toLocaleString()}` : 'Not set'} />
              </div>
            )}
          </InfoCard>

          {/* P2-15: Medical Information */}
          <InfoCard
            title="Medical Information"
            action={
              editingSection === 'medical' ? (
                <div className="flex gap-2">
                  <Button size="sm" color="secondary" iconLeading={XClose} onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" color="primary" iconLeading={Check} onClick={() => handleSaveSection('medical')}>Save</Button>
                </div>
              ) : (
                <Button size="sm" color="secondary" iconLeading={Edit01} onClick={() => openSectionEdit('medical')}>Edit</Button>
              )
            }
          >
            {editingSection === 'medical' ? (
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={medicalForm.carries_epipen} onChange={(e) => setMedicalForm(prev => ({ ...prev, carries_epipen: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-primary">Carries EpiPen</span>
                </label>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Allergies (comma-separated)</label>
                  <input value={medicalForm.allergies} onChange={(e) => setMedicalForm(prev => ({ ...prev, allergies: e.target.value }))} placeholder="Peanuts, Shellfish" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-tertiary">Accessibility Needs</label>
                  <textarea rows={2} value={medicalForm.accessibility_needs} onChange={(e) => setMedicalForm(prev => ({ ...prev, accessibility_needs: e.target.value }))} placeholder="Any special accessibility requirements" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="border-t border-secondary pt-4">
                  <p className="text-xs font-medium text-tertiary mb-3">Insurance Information</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Provider</label>
                      <input value={medicalForm.insurance_provider} onChange={(e) => setMedicalForm(prev => ({ ...prev, insurance_provider: e.target.value }))} placeholder="Blue Cross" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Plan Name</label>
                      <input value={medicalForm.insurance_plan_name} onChange={(e) => setMedicalForm(prev => ({ ...prev, insurance_plan_name: e.target.value }))} placeholder="PPO Gold" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 mt-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Member ID</label>
                      <input value={medicalForm.insurance_member_id} onChange={(e) => setMedicalForm(prev => ({ ...prev, insurance_member_id: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-tertiary">Preferred Facilities</label>
                      <input value={medicalForm.preferred_medical_facilities} onChange={(e) => setMedicalForm(prev => ({ ...prev, preferred_medical_facilities: e.target.value }))} placeholder="Cedars-Sinai, Mayo Clinic" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {rawExecData?.carries_epipen && (
                  <div className="flex items-center gap-2">
                    <Badge color="error" type="pill-color" size="sm">Carries EpiPen</Badge>
                  </div>
                )}
                {(rawExecData?.allergies || []).length > 0 && (
                  <div>
                    <p className="text-xs text-tertiary mb-1">Allergies</p>
                    <div className="flex flex-wrap gap-2">{(rawExecData.allergies || []).map((a: string, i: number) => <Badge key={i} color="warning" type="pill-color" size="sm">{a}</Badge>)}</div>
                  </div>
                )}
                {rawExecData?.accessibility_needs && (
                  <div>
                    <p className="text-xs text-tertiary">Accessibility Needs</p>
                    <p className="text-sm text-primary">{rawExecData.accessibility_needs}</p>
                  </div>
                )}
                {rawExecData?.insurance_provider && (
                  <div className="border-t border-secondary pt-3">
                    <p className="text-xs text-tertiary">Insurance</p>
                    <p className="text-sm font-medium text-primary">{rawExecData.insurance_provider}{rawExecData?.insurance_plan_name ? ` — ${rawExecData.insurance_plan_name}` : ''}</p>
                  </div>
                )}
                {!rawExecData?.carries_epipen && !(rawExecData?.allergies || []).length && !rawExecData?.insurance_provider && !rawExecData?.accessibility_needs && (
                  <p className="text-sm text-tertiary">No medical information on file</p>
                )}
              </div>
            )}
          </InfoCard>

          {/* P2-08: Escalation Rules */}
          <InfoCard title="Escalation Rules">
            {escalationRules.length === 0 && (
              <p className="text-sm text-tertiary mb-3">No escalation rules defined. Add rules describing how to handle urgent situations.</p>
            )}
            {escalationRules.length > 0 && (
              <div className="space-y-2 mb-3">
                {escalationRules.map((rule, i) => (
                  <div key={rule.id} className="group flex items-start gap-2 rounded-lg border border-secondary p-3">
                    <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold flex items-center justify-center dark:bg-brand-900/30">{i + 1}</span>
                    {editingRuleId === rule.id ? (
                      <textarea
                        autoFocus
                        rows={2}
                        value={editingRuleText}
                        onChange={(e) => setEditingRuleText(e.target.value)}
                        onBlur={handleSaveRuleEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveRuleEdit(); } if (e.key === 'Escape') setEditingRuleId(null); }}
                        className="flex-1 rounded border border-brand-300 bg-white px-2 py-1 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-800"
                      />
                    ) : (
                      <p className="flex-1 text-sm text-primary cursor-pointer" onDoubleClick={() => { setEditingRuleId(rule.id); setEditingRuleText(rule.rule_description); }}>{rule.rule_description}</p>
                    )}
                    {editingRuleId !== rule.id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingRuleId(rule.id); setEditingRuleText(rule.rule_description); }} className="rounded p-1 text-tertiary hover:text-primary"><Edit01 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteRule(rule.id)} className="rounded p-1 text-tertiary hover:text-red-600"><Trash01 className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add an escalation rule..."
                value={newRuleText}
                onChange={(e) => setNewRuleText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddRule(); }}
                className="flex-1 rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
              <Button size="sm" color="secondary" iconLeading={Plus} onClick={handleAddRule} disabled={!newRuleText.trim()}>Add</Button>
            </div>
          </InfoCard>

          {/* P2-14: Emergency Contacts */}
          <InfoCard title="Emergency Contacts">
            {/* Business */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Business</p>
                <button onClick={() => setIsAddEmergencyOpen('business')} className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Add</button>
              </div>
              {emergencyContacts.filter(c => c.category === 'business').length === 0 ? (
                <p className="text-sm text-tertiary">No business emergency contacts</p>
              ) : (
                <div className="space-y-2">
                  {emergencyContacts.filter(c => c.category === 'business').map(ec => (
                    <div key={ec.id} className="group flex items-center gap-3 rounded-lg border border-secondary p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary">{ec.name}</p>
                        <p className="text-xs text-tertiary">{ec.role || 'No role specified'}{ec.phone ? ` · ${ec.phone}` : ''}{ec.email ? ` · ${ec.email}` : ''}</p>
                      </div>
                      <button onClick={() => handleDeleteEmergencyContact(ec.id)} className="rounded p-1 text-tertiary opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
                        <Trash01 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Personal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Personal</p>
                <button onClick={() => setIsAddEmergencyOpen('personal')} className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ Add</button>
              </div>
              {emergencyContacts.filter(c => c.category === 'personal').length === 0 ? (
                <p className="text-sm text-tertiary">No personal emergency contacts</p>
              ) : (
                <div className="space-y-2">
                  {emergencyContacts.filter(c => c.category === 'personal').map(ec => (
                    <div key={ec.id} className="group flex items-center gap-3 rounded-lg border border-secondary p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary">{ec.name}</p>
                        <p className="text-xs text-tertiary">{ec.role || 'No relationship specified'}{ec.phone ? ` · ${ec.phone}` : ''}{ec.email ? ` · ${ec.email}` : ''}</p>
                      </div>
                      <button onClick={() => handleDeleteEmergencyContact(ec.id)} className="rounded p-1 text-tertiary opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600">
                        <Trash01 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </InfoCard>
        </div>
      )}

      {/* Add Emergency Contact Modal */}
      {isAddEmergencyOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add {isAddEmergencyOpen === 'business' ? 'Business' : 'Personal'} Emergency Contact</h3>
            <form onSubmit={handleAddEmergencyContact} className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                  <input name="name" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{isAddEmergencyOpen === 'business' ? 'Role' : 'Relationship'}</label>
                  <input name="role" placeholder={isAddEmergencyOpen === 'business' ? 'e.g., Legal Counsel, CFO' : 'e.g., Spouse, Parent'} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input name="phone" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input name="email" type="email" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setIsAddEmergencyOpen(null)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Add Contact</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "direct-reports" && (
        <InfoCard
          title="Stakeholders & Team"
          action={<Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setIsAddDirectReportOpen(true)}>Add</Button>}
        >
          {directReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users01 className="h-10 w-10 text-fg-quaternary mb-2" />
              <p className="text-sm font-medium text-primary">No stakeholders or team members</p>
              <p className="text-xs text-tertiary">Add stakeholders and team members for this executive.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {directReports.map((report) => (
                <div key={report.id} className="flex items-center gap-3 rounded-lg border border-secondary p-3 group">
                  <Avatar initials={getInitials(report.name)} alt={report.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{report.name}</p>
                    <p className="text-xs text-tertiary">{report.title}</p>
                  </div>
                  <Badge color="gray" type="pill-color" size="sm">{report.department}</Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingDirectReport(report)} className="rounded-md p-1.5 text-tertiary hover:bg-secondary hover:text-primary">
                      <Edit01 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteDirectReport(report.id)} className="rounded-md p-1.5 text-tertiary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                      <Trash01 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      )}

      {activeTab === "family" && (
        <InfoCard
          title="Family Members"
          action={<Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setIsAddFamilyMemberOpen(true)}>Add</Button>}
        >
          {familyMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Heart className="h-10 w-10 text-fg-quaternary mb-2" />
              <p className="text-sm font-medium text-primary">No family members</p>
              <p className="text-xs text-tertiary">Add family members to track birthdays and preferences.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border border-secondary p-3 group">
                  <Avatar initials={getInitials(member.name)} alt={member.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{member.name}</p>
                    <p className="text-xs text-tertiary">{member.relationship}</p>
                  </div>
                  {member.birthday && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-fg-quaternary" />
                      <span className="text-xs text-tertiary">{member.birthday}</span>
                    </div>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingFamilyMember(member)} className="rounded-md p-1.5 text-tertiary hover:bg-secondary hover:text-primary">
                      <Edit01 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteFamilyMember(member.id)} className="rounded-md p-1.5 text-tertiary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                      <Trash01 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </InfoCard>
      )}

      {activeTab === "memberships" && (
        <InfoCard
          title="Memberships & Loyalty Programs"
          action={<Button size="sm" color="secondary" iconLeading={Plus} onClick={() => setIsAddMembershipOpen(true)}>Add</Button>}
        >
          {memberships.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Award01 className="h-10 w-10 text-fg-quaternary mb-2" />
              <p className="text-sm font-medium text-primary">No memberships</p>
              <p className="text-xs text-tertiary">Add loyalty programs and memberships for this executive.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map((membership) => {
                const Icon = getMembershipIcon(membership.category);
                return (
                  <div key={membership.id} className="flex items-center gap-3 rounded-lg border border-secondary p-3 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-5 w-5 text-fg-quaternary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">{membership.name}</p>
                      <p className="text-xs text-tertiary">{membership.memberNumber}</p>
                    </div>
                    {membership.tier && (
                      <Badge color="brand" type="pill-color" size="sm">{membership.tier}</Badge>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingMembership(membership)} className="rounded-md p-1.5 text-tertiary hover:bg-secondary hover:text-primary">
                        <Edit01 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteMembership(membership.id)} className="rounded-md p-1.5 text-tertiary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400">
                        <Trash01 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </InfoCard>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Executive Profile</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update {executive.name}&apos;s profile details.</p>
            <div className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <input value={editForm.full_name} onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Name</label>
                  <input value={editForm.preferred_name} onChange={(e) => setEditForm(prev => ({ ...prev, preferred_name: e.target.value }))} placeholder="e.g., Jen, Bill" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <input value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Office Location</label>
                  <input value={editForm.office_location} onChange={(e) => setEditForm(prev => ({ ...prev, office_location: e.target.value }))} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                  <NativeSelect size="sm" value={editForm.timezone} onChange={(e) => setEditForm(prev => ({ ...prev, timezone: e.target.value }))} options={[
                    { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
                    { label: "Mountain Time (MT)", value: "America/Denver" },
                    { label: "Central Time (CT)", value: "America/Chicago" },
                    { label: "Eastern Time (ET)", value: "America/New_York" },
                    { label: "GMT", value: "Europe/London" },
                    { label: "CET", value: "Europe/Berlin" },
                  ]} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Home Address</label>
                <textarea rows={2} value={editForm.home_address} onChange={(e) => setEditForm(prev => ({ ...prev, home_address: e.target.value }))} placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <textarea rows={3} value={editForm.bio} onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button size="md" color="secondary" className="flex-1" onClick={() => setIsEditProfileOpen(false)}>Cancel</Button>
              <Button size="md" color="primary" className="flex-1" onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stakeholder Modal */}
      {isAddDirectReportOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Stakeholder / Team Member</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a stakeholder or team member for {executive.name}.</p>
            <form onSubmit={handleAddDirectReport} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                <input name="full_name" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <input name="title" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                  <input name="department" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input name="email" type="email" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setIsAddDirectReportOpen(false)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Add Stakeholder</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {isAddFamilyMemberOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Family Member</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a family member for {executive.name}.</p>
            <form onSubmit={handleAddFamilyMember} className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                  <input name="full_name" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationship *</label>
                  <select name="relationship" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100">
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Birthday</label>
                <input name="birthday" type="date" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea name="notes" rows={2} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setIsAddFamilyMemberOpen(false)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Add Family Member</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Membership Modal */}
      {isAddMembershipOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Membership</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add a loyalty program or membership.</p>
            <form onSubmit={handleAddMembership} className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                  <select name="category" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100">
                    <option value="airlines">Airlines</option>
                    <option value="hotels">Hotels</option>
                    <option value="lounges">Lounges</option>
                    <option value="car_rental">Car Rental</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider Name *</label>
                  <input name="provider_name" required className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" placeholder="e.g., United Airlines" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Program Name</label>
                  <input name="program_name" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" placeholder="e.g., MileagePlus" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Member Number</label>
                  <input name="member_number" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tier</label>
                  <input name="tier" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" placeholder="e.g., Gold, Platinum" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expires</label>
                  <input name="expires_at" type="date" className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setIsAddMembershipOpen(false)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Add Membership</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Stakeholder Modal */}
      {editingDirectReport && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Stakeholder</h3>
            <form onSubmit={handleEditDirectReport} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                <input name="full_name" required defaultValue={editingDirectReport.name} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <input name="title" defaultValue={editingDirectReport.title} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                  <input name="department" defaultValue={editingDirectReport.department} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input name="email" type="email" defaultValue={editingDirectReport.email} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setEditingDirectReport(null)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Family Member Modal */}
      {editingFamilyMember && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Family Member</h3>
            <form onSubmit={handleEditFamilyMember} className="mt-5 flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                  <input name="full_name" required defaultValue={editingFamilyMember.name} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationship *</label>
                  <select name="relationship" required defaultValue={editingFamilyMember.relationship} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100">
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Birthday</label>
                <input name="birthday" type="date" defaultValue={(() => {
                  const raw = rawExecData?.family_members?.find((fm: any) => fm.id === editingFamilyMember.id);
                  return raw?.birthday ? raw.birthday.split('T')[0] : '';
                })()} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea name="notes" rows={2} defaultValue={editingFamilyMember.notes || ''} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="mt-2 flex gap-3">
                <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setEditingFamilyMember(null)}>Cancel</Button>
                <Button type="submit" size="md" color="primary" className="flex-1">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Membership Modal */}
      {editingMembership && (() => {
        const rawMembership = rawExecData?.memberships?.find((m: any) => m.id === editingMembership.id);
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Membership</h3>
              <form onSubmit={handleEditMembership} className="mt-5 flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category *</label>
                    <select name="category" required defaultValue={rawMembership?.category || editingMembership.category} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100">
                      <option value="airlines">Airlines</option>
                      <option value="hotels">Hotels</option>
                      <option value="lounges">Lounges</option>
                      <option value="car_rental">Car Rental</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider Name *</label>
                    <input name="provider_name" required defaultValue={rawMembership?.provider_name || ''} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Program Name</label>
                    <input name="program_name" defaultValue={rawMembership?.program_name || ''} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Member Number</label>
                    <input name="member_number" defaultValue={rawMembership?.member_number || editingMembership.memberNumber || ''} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tier</label>
                    <input name="tier" defaultValue={rawMembership?.tier || editingMembership.tier || ''} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expires</label>
                    <input name="expires_at" type="date" defaultValue={rawMembership?.expires_at ? rawMembership.expires_at.split('T')[0] : ''} className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
                  </div>
                </div>
                <div className="mt-2 flex gap-3">
                  <Button type="button" size="md" color="secondary" className="flex-1" onClick={() => setEditingMembership(null)}>Cancel</Button>
                  <Button type="submit" size="md" color="primary" className="flex-1">Save Changes</Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* P2-09: Archive Confirmation Dialog */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Archive Executive</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to archive {executive.name}&apos;s profile? This will hide them from active views but their data will be preserved.
            </p>
            <div className="mt-5 flex gap-3">
              <Button size="md" color="secondary" className="flex-1" onClick={() => setShowArchiveConfirm(false)}>Cancel</Button>
              <Button size="md" color="primary" className="flex-1 bg-warning-600 hover:bg-warning-700" onClick={handleArchiveToggle} disabled={isArchiving}>
                {isArchiving ? 'Archiving...' : 'Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
