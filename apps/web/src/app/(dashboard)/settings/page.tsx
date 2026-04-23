"use client";

/**
 * Settings Page
 * Unified settings with tab-based navigation
 * Connected to real database via /api/settings/* endpoints
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard02, Plus, SearchLg, RefreshCw01, Clock } from "@untitledui/icons";
import { integrationLogos } from "./_components/integration-logos";
import { PreferencesTab } from "./_components/preferences-tab";
import { InviteMemberSlideout, type InviteMemberData } from "./_components/invite-member-slideout";
import { TabList, Tabs } from "@/components/application/tabs/tabs";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { ConfirmationDialog } from "@/components/application/confirmation-dialog/confirmation-dialog";
import { notify } from "@/lib/notifications";

const tabs = [
  { id: "profile", label: "My Profile" },
  { id: "organization", label: "Organization" },
  { id: "preferences", label: "Preferences" },
  { id: "integrations", label: "Integrations" },
  { id: "team", label: "Team" },
  { id: "billing", label: "Billing" },
  { id: "audit", label: "Audit Log" },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get("tab") || "profile";
  const [selectedTab, setSelectedTab] = useState<string>(tabFromUrl);

  useEffect(() => {
    setSelectedTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-xl font-semibold text-primary lg:text-2xl">Settings</h1>
          <Input className="lg:w-80" size="sm" shortcut aria-label="Search" placeholder="Search settings..." icon={SearchLg} />
        </div>
        <NativeSelect
          aria-label="Settings tabs"
          className="md:hidden"
          value={selectedTab}
          onChange={(e) => handleTabChange(e.target.value)}
          options={tabs.map((tab) => ({ label: tab.label, value: tab.id }))}
        />
        <div className="-mx-4 -my-1 flex overflow-auto px-4 py-1 lg:-mx-8 lg:px-8">
          <Tabs className="hidden w-full md:flex" selectedKey={selectedTab} onSelectionChange={(v) => handleTabChange(v as string)}>
            <TabList type="underline" className="w-full" items={tabs} />
          </Tabs>
        </div>
      </div>

      {selectedTab === "profile" && <ProfileTab />}
      {selectedTab === "organization" && <OrganizationTab />}
      {selectedTab === "preferences" && <PreferencesTab />}
      {selectedTab === "integrations" && <IntegrationsTab />}
      {selectedTab === "team" && <TeamTab />}
      {selectedTab === "billing" && <BillingTab />}
      {selectedTab === "audit" && <AuditTab />}
    </div>
  );
}

// Types for profile data
interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  timezone?: string;
  role: string;
  job_title?: string;
  phone?: string;
  phone_extension?: string | null;
  secondary_email?: string | null;
  secondary_phone?: string | null;
  additional_office_address?: string | null;
  religion?: "Christian" | "Hindu" | "Jewish" | "Muslim" | null;
  emergency_contacts?: Array<{
    name: string;
    relationship?: string;
    phone?: string;
    email?: string;
    address?: string;
  }>;
}

function ProfileTab() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change state
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneExtension, setPhoneExtension] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [additionalOfficeAddress, setAdditionalOfficeAddress] = useState("");
  const [religion, setReligion] = useState<"" | "Christian" | "Hindu" | "Jewish" | "Muslim">("");
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: "", relationship: "", phone: "", email: "", address: "" },
    { name: "", relationship: "", phone: "", email: "", address: "" },
  ]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/settings/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload avatar');
      }

      const result = await response.json();
      const uploadedUrl = result.data?.data?.avatar_url ?? result.data?.avatar_url;
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        setProfile(prev => prev ? { ...prev, avatar_url: uploadedUrl } : prev);
      }
      notify.success('Photo updated', 'Your profile photo has been updated.');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to upload photo.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const result = await response.json();
        const profileData = result.data?.data ?? result.data;
        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || "");
          setEmail(profileData.email || "");
          setJobTitle(profileData.job_title || "");
          setPhone(profileData.phone || "");
          setPhoneExtension(profileData.phone_extension || "");
          setTimezone(profileData.timezone || "America/Los_Angeles");
          setAvatarUrl(profileData.avatar_url || null);
          setSecondaryEmail(profileData.secondary_email || "");
          setSecondaryPhone(profileData.secondary_phone || "");
          setAdditionalOfficeAddress(profileData.additional_office_address || "");
          setReligion(profileData.religion || "");
          const contacts = Array.isArray(profileData.emergency_contacts) ? profileData.emergency_contacts : [];
          setEmergencyContacts([
            {
              name: contacts[0]?.name || "",
              relationship: contacts[0]?.relationship || "",
              phone: contacts[0]?.phone || "",
              email: contacts[0]?.email || "",
              address: contacts[0]?.address || "",
            },
            {
              name: contacts[1]?.name || "",
              relationship: contacts[1]?.relationship || "",
              phone: contacts[1]?.phone || "",
              email: contacts[1]?.email || "",
              address: contacts[1]?.address || "",
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          job_title: jobTitle || null,
          phone: phone || null,
          phone_extension: phoneExtension || null,
          secondary_email: secondaryEmail || null,
          secondary_phone: secondaryPhone || null,
          additional_office_address: additionalOfficeAddress || null,
          religion: religion || null,
          emergency_contacts: emergencyContacts
            .map((contact) => ({
              name: contact.name.trim(),
              relationship: contact.relationship.trim() || undefined,
              phone: contact.phone.trim() || undefined,
              email: contact.email.trim() || undefined,
              address: contact.address.trim() || undefined,
            }))
            .filter((contact) => contact.name),
          timezone,
        }),
      });
      if (!response.ok) throw new Error('Failed to save profile');
      const result = await response.json();
      const savedProfile = result.data?.data ?? result.data;
      setProfile(savedProfile);
      notify.success('Profile updated', 'Your profile has been saved successfully.');
    } catch (err) {
      console.error('Failed to save profile:', err);
      notify.error('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setJobTitle(profile.job_title || "");
      setPhone(profile.phone || "");
      setPhoneExtension((profile as any).phone_extension || "");
      setTimezone(profile.timezone || "America/Los_Angeles");
      setSecondaryEmail(profile.secondary_email || "");
      setSecondaryPhone(profile.secondary_phone || "");
      setAdditionalOfficeAddress(profile.additional_office_address || "");
      setReligion(profile.religion || "");
      const contacts = Array.isArray(profile.emergency_contacts) ? profile.emergency_contacts : [];
      setEmergencyContacts([
        {
          name: contacts[0]?.name || "",
          relationship: contacts[0]?.relationship || "",
          phone: contacts[0]?.phone || "",
          email: contacts[0]?.email || "",
          address: contacts[0]?.address || "",
        },
        {
          name: contacts[1]?.name || "",
          relationship: contacts[1]?.relationship || "",
          phone: contacts[1]?.phone || "",
          email: contacts[1]?.email || "",
          address: contacts[1]?.address || "",
        },
      ]);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/settings/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to change password');
      }
      notify.success('Password changed', 'Your password has been updated.');
      setIsPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0]?.charAt(0) || "?";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load profile</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Personal Information</h2>
        <p className="text-sm text-tertiary">Update your personal details and preferences.</p>
      </div>
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar size="2xl" src={avatarUrl || undefined} initials={getInitials(fullName)} alt={fullName} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button color="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}>
              {isUploadingAvatar ? 'Uploading...' : 'Change photo'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Full Name</label>
              <Input size="sm" value={fullName} onChange={(val) => setFullName(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Email</label>
              <Input size="sm" value={email} isDisabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Job Title</label>
              <Input size="sm" value={jobTitle} onChange={(val) => setJobTitle(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Phone</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input size="sm" value={phone} onChange={(val) => setPhone(val)} />
                </div>
                <div className="w-24">
                  <input
                    type="text"
                    placeholder="Ext."
                    value={phoneExtension}
                    onChange={(e) => setPhoneExtension(e.target.value)}
                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-[7px] text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-secondary">Timezone</label>
              <NativeSelect
                size="sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={[
                  { label: "(UTC-12:00) International Date Line West", value: "Etc/GMT+12" },
                  { label: "(UTC-11:00) Midway Island, Samoa", value: "Pacific/Samoa" },
                  { label: "(UTC-10:00) Hawaii", value: "Pacific/Honolulu" },
                  { label: "(UTC-09:00) Alaska", value: "America/Anchorage" },
                  { label: "(UTC-08:00) Pacific Time (US & Canada)", value: "America/Los_Angeles" },
                  { label: "(UTC-07:00) Mountain Time (US & Canada)", value: "America/Denver" },
                  { label: "(UTC-07:00) Arizona", value: "America/Phoenix" },
                  { label: "(UTC-06:00) Central Time (US & Canada)", value: "America/Chicago" },
                  { label: "(UTC-06:00) Mexico City", value: "America/Mexico_City" },
                  { label: "(UTC-05:00) Eastern Time (US & Canada)", value: "America/New_York" },
                  { label: "(UTC-05:00) Bogota, Lima, Quito", value: "America/Bogota" },
                  { label: "(UTC-04:00) Atlantic Time (Canada)", value: "America/Halifax" },
                  { label: "(UTC-04:00) Santiago", value: "America/Santiago" },
                  { label: "(UTC-03:30) Newfoundland", value: "America/St_Johns" },
                  { label: "(UTC-03:00) Buenos Aires", value: "America/Argentina/Buenos_Aires" },
                  { label: "(UTC-03:00) Sao Paulo", value: "America/Sao_Paulo" },
                  { label: "(UTC-02:00) Mid-Atlantic", value: "Atlantic/South_Georgia" },
                  { label: "(UTC-01:00) Azores", value: "Atlantic/Azores" },
                  { label: "(UTC+00:00) London, Dublin, Lisbon", value: "Europe/London" },
                  { label: "(UTC+00:00) Casablanca, Monrovia", value: "Africa/Casablanca" },
                  { label: "(UTC+01:00) Paris, Berlin, Amsterdam", value: "Europe/Paris" },
                  { label: "(UTC+01:00) Lagos, West Central Africa", value: "Africa/Lagos" },
                  { label: "(UTC+02:00) Athens, Bucharest, Istanbul", value: "Europe/Athens" },
                  { label: "(UTC+02:00) Cairo", value: "Africa/Cairo" },
                  { label: "(UTC+02:00) Johannesburg, Harare", value: "Africa/Johannesburg" },
                  { label: "(UTC+02:00) Helsinki, Kyiv", value: "Europe/Helsinki" },
                  { label: "(UTC+03:00) Moscow, St. Petersburg", value: "Europe/Moscow" },
                  { label: "(UTC+03:00) Kuwait, Riyadh, Baghdad", value: "Asia/Riyadh" },
                  { label: "(UTC+03:00) Nairobi", value: "Africa/Nairobi" },
                  { label: "(UTC+03:30) Tehran", value: "Asia/Tehran" },
                  { label: "(UTC+04:00) Abu Dhabi, Muscat, Dubai", value: "Asia/Dubai" },
                  { label: "(UTC+04:30) Kabul", value: "Asia/Kabul" },
                  { label: "(UTC+05:00) Islamabad, Karachi, Tashkent", value: "Asia/Karachi" },
                  { label: "(UTC+05:30) Mumbai, Kolkata, Chennai", value: "Asia/Kolkata" },
                  { label: "(UTC+05:45) Kathmandu", value: "Asia/Kathmandu" },
                  { label: "(UTC+06:00) Almaty, Dhaka", value: "Asia/Dhaka" },
                  { label: "(UTC+06:30) Yangon (Rangoon)", value: "Asia/Yangon" },
                  { label: "(UTC+07:00) Bangkok, Hanoi, Jakarta", value: "Asia/Bangkok" },
                  { label: "(UTC+08:00) Beijing, Hong Kong, Singapore", value: "Asia/Shanghai" },
                  { label: "(UTC+08:00) Perth", value: "Australia/Perth" },
                  { label: "(UTC+08:00) Taipei", value: "Asia/Taipei" },
                  { label: "(UTC+09:00) Tokyo, Seoul", value: "Asia/Tokyo" },
                  { label: "(UTC+09:30) Adelaide, Darwin", value: "Australia/Adelaide" },
                  { label: "(UTC+10:00) Sydney, Melbourne, Brisbane", value: "Australia/Sydney" },
                  { label: "(UTC+10:00) Guam, Port Moresby", value: "Pacific/Guam" },
                  { label: "(UTC+11:00) Solomon Is., New Caledonia", value: "Pacific/Guadalcanal" },
                  { label: "(UTC+12:00) Auckland, Wellington", value: "Pacific/Auckland" },
                  { label: "(UTC+12:00) Fiji, Marshall Is.", value: "Pacific/Fiji" },
                  { label: "(UTC+13:00) Nuku'alofa, Samoa", value: "Pacific/Tongatapu" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Religion</label>
              <NativeSelect
                size="sm"
                value={religion}
                onChange={(e) => setReligion(e.target.value as typeof religion)}
                options={[
                  { label: "None", value: "" },
                  { label: "Christian", value: "Christian" },
                  { label: "Hindu", value: "Hindu" },
                  { label: "Jewish", value: "Jewish" },
                  { label: "Muslim", value: "Muslim" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Second email</label>
              <Input
                size="sm"
                value={secondaryEmail}
                onChange={(val) => setSecondaryEmail(val)}
                placeholder="name+alt@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Second phone</label>
              <Input
                size="sm"
                value={secondaryPhone}
                onChange={(val) => setSecondaryPhone(val)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Additional office address</label>
              <Input
                size="sm"
                value={additionalOfficeAddress}
                onChange={(val) => setAdditionalOfficeAddress(val)}
                placeholder="Suite, floor, or secondary office"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-secondary">Emergency contacts</label>
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="rounded-lg border border-secondary p-3">
                  <p className="mb-2 text-xs font-semibold text-tertiary">Contact {index + 1}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      size="sm"
                      value={contact.name}
                      onChange={(val) =>
                        setEmergencyContacts((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, name: val } : item))
                        )
                      }
                      placeholder="Name"
                    />
                    <Input
                      size="sm"
                      value={contact.relationship}
                      onChange={(val) =>
                        setEmergencyContacts((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, relationship: val } : item))
                        )
                      }
                      placeholder="Relationship"
                    />
                    <Input
                      size="sm"
                      value={contact.phone}
                      onChange={(val) =>
                        setEmergencyContacts((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, phone: val } : item))
                        )
                      }
                      placeholder="Phone"
                    />
                    <Input
                      size="sm"
                      value={contact.email}
                      onChange={(val) =>
                        setEmergencyContacts((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, email: val } : item))
                        )
                      }
                      placeholder="Email"
                    />
                    <div className="md:col-span-2">
                      <Input
                        size="sm"
                        value={contact.address}
                        onChange={(val) =>
                          setEmergencyContacts((prev) =>
                            prev.map((item, i) => (i === index ? { ...item, address: val } : item))
                          )
                        }
                        placeholder="Address"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-secondary pt-4">
          <Button color="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
          <Button color="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="mt-2">
        <h2 className="text-lg font-semibold text-primary">Security</h2>
        <p className="text-sm text-tertiary">Manage your password and account security.</p>
      </div>
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        {!isPasswordOpen ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Password</p>
              <p className="text-sm text-tertiary">Update your password to keep your account secure.</p>
            </div>
            <Button color="secondary" size="sm" onClick={() => setIsPasswordOpen(true)}>Change Password</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-primary">Change Password</h3>
            {passwordError && (
              <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">{passwordError}</div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters"
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-secondary pt-4">
              <Button color="secondary" size="sm" onClick={() => { setIsPasswordOpen(false); setPasswordError(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>Cancel</Button>
              <Button color="primary" size="sm" onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? 'Changing...' : 'Update Password'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Types for organization data
interface OrganizationData {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  size?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  authorized_rep_name?: string;
  authorized_rep_title?: string;
  authorized_rep_email?: string;
  authorized_rep_phone?: string;
}

function OrganizationTab() {
  const [org, setOrg] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("technology");
  const [companySize, setCompanySize] = useState("11-50");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Address state
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");

  // Authorized representative state
  const [repName, setRepName] = useState("");
  const [repTitle, setRepTitle] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/settings/organization/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upload logo');
      }

      const result = await response.json();
      const uploadedUrl = result.data?.data?.logo_url ?? result.data?.logo_url;
      if (uploadedUrl) {
        setLogoUrl(uploadedUrl);
        setOrg(prev => prev ? { ...prev, logo_url: uploadedUrl } : prev);
      }
      notify.success('Logo updated', 'Your organization logo has been updated.');
    } catch (err) {
      console.error('Failed to upload logo:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to upload logo.');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Fetch organization data
  useEffect(() => {
    const fetchOrg = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/organization');
        if (!response.ok) throw new Error('Failed to fetch organization');
        const result = await response.json();
        const orgData = result.data?.data ?? result.data;
        if (orgData) {
          setOrg(orgData);
          setName(orgData.name || "");
          setWebsite(orgData.website || "");
          setIndustry(orgData.industry || "technology");
          setCompanySize(orgData.size || orgData.company_size || "11-50");
          setLogoUrl(orgData.logo_url || null);
          setAddressLine1(orgData.address_line1 || "");
          setAddressLine2(orgData.address_line2 || "");
          setCity(orgData.city || "");
          setState(orgData.state || "");
          setZipCode(orgData.zip_code || "");
          setCountry(orgData.country || "");
          setRepName(orgData.authorized_rep_name || "");
          setRepTitle(orgData.authorized_rep_title || "");
          setRepEmail(orgData.authorized_rep_email || "");
          setRepPhone(orgData.authorized_rep_phone || "");
        }
      } catch (err) {
        console.error('Failed to fetch organization:', err);
        setError(err instanceof Error ? err.message : 'Failed to load organization');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrg();
  }, []);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          website: website || null,
          industry,
          company_size: companySize,
          address_line1: addressLine1 || null,
          address_line2: addressLine2 || null,
          city: city || null,
          state: state || null,
          zip_code: zipCode || null,
          country: country || null,
          authorized_rep_name: repName || null,
          authorized_rep_title: repTitle || null,
          authorized_rep_email: repEmail || null,
          authorized_rep_phone: repPhone || null,
        }),
      });
      if (!response.ok) throw new Error('Failed to save organization');
      const result = await response.json();
      const savedOrg = result.data?.data ?? result.data;
      setOrg(savedOrg);
      notify.success('Organization updated', 'Your organization settings have been saved.');
    } catch (err) {
      console.error('Failed to save organization:', err);
      notify.error('Error', 'Failed to save organization. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (org) {
      setName(org.name || "");
      setWebsite(org.website || "");
      setIndustry(org.industry || "technology");
      setCompanySize(org.size || org.company_size || "11-50");
      setAddressLine1(org.address_line1 || "");
      setAddressLine2(org.address_line2 || "");
      setCity(org.city || "");
      setState(org.state || "");
      setZipCode(org.zip_code || "");
      setCountry(org.country || "");
      setRepName(org.authorized_rep_name || "");
      setRepTitle(org.authorized_rep_title || "");
      setRepEmail(org.authorized_rep_email || "");
      setRepPhone(org.authorized_rep_phone || "");
    }
  };

  // Get initials for logo
  const getInitials = (orgName: string) => orgName?.charAt(0)?.toUpperCase() || "O";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load organization</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Organization Settings</h2>
        <p className="text-sm text-tertiary">Manage your workspace and company details.</p>
      </div>
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-16 w-16 rounded-xl object-cover ring-1 ring-secondary" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-600">
                <span className="text-2xl font-bold text-white">{getInitials(name)}</span>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button color="secondary" size="sm" onClick={() => logoInputRef.current?.click()} disabled={isUploadingLogo}>
              {isUploadingLogo ? 'Uploading...' : 'Change logo'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Organization Name</label>
              <Input size="sm" value={name} onChange={(val) => setName(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Website</label>
              <Input size="sm" value={website} onChange={(val) => setWebsite(val)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Industry</label>
              <NativeSelect
                size="sm"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                options={[
                  { label: "Technology", value: "technology" },
                  { label: "Finance & Banking", value: "finance" },
                  { label: "Healthcare & Pharma", value: "healthcare" },
                  { label: "Legal", value: "legal" },
                  { label: "Real Estate", value: "real_estate" },
                  { label: "Education", value: "education" },
                  { label: "Government & Public Sector", value: "government" },
                  { label: "Non-Profit", value: "non_profit" },
                  { label: "Consulting", value: "consulting" },
                  { label: "Manufacturing", value: "manufacturing" },
                  { label: "Retail & E-Commerce", value: "retail" },
                  { label: "Media & Entertainment", value: "media" },
                  { label: "Energy & Utilities", value: "energy" },
                  { label: "Transportation & Logistics", value: "transportation" },
                  { label: "Hospitality & Travel", value: "hospitality" },
                  { label: "Insurance", value: "insurance" },
                  { label: "Telecommunications", value: "telecom" },
                  { label: "Construction", value: "construction" },
                  { label: "Agriculture", value: "agriculture" },
                  { label: "Other", value: "other" },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">Company Size</label>
              <NativeSelect
                size="sm"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                options={[
                  { label: "Solo (1)", value: "1" },
                  { label: "2-10 employees", value: "2-10" },
                  { label: "11-50 employees", value: "11-50" },
                  { label: "51-100 employees", value: "51-100" },
                  { label: "101-250 employees", value: "101-250" },
                  { label: "251-500 employees", value: "251-500" },
                  { label: "501-1,000 employees", value: "501-1000" },
                  { label: "1,001-5,000 employees", value: "1001-5000" },
                  { label: "5,001-10,000 employees", value: "5001-10000" },
                  { label: "10,000+ employees", value: "10000+" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="mt-2">
        <h2 className="text-lg font-semibold text-primary">Organization Address</h2>
        <p className="text-sm text-tertiary">The physical address for your organization.</p>
      </div>
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Address Line 1</label>
            <input type="text" placeholder="Street address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Address Line 2</label>
            <input type="text" placeholder="Suite, unit, floor, etc." value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)}
              className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">State / Province</label>
              <input type="text" value={state} onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">ZIP / Postal Code</label>
              <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)}
                className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Country</label>
            <NativeSelect
              size="sm"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={[
                { label: "Select a country", value: "" },
                { label: "United States", value: "US" },
                { label: "Canada", value: "CA" },
                { label: "United Kingdom", value: "GB" },
                { label: "Australia", value: "AU" },
                { label: "Germany", value: "DE" },
                { label: "France", value: "FR" },
                { label: "Japan", value: "JP" },
                { label: "India", value: "IN" },
                { label: "Brazil", value: "BR" },
                { label: "Mexico", value: "MX" },
                { label: "South Africa", value: "ZA" },
                { label: "United Arab Emirates", value: "AE" },
                { label: "Singapore", value: "SG" },
                { label: "Netherlands", value: "NL" },
                { label: "Switzerland", value: "CH" },
                { label: "Spain", value: "ES" },
                { label: "Italy", value: "IT" },
                { label: "South Korea", value: "KR" },
                { label: "Sweden", value: "SE" },
                { label: "Norway", value: "NO" },
                { label: "Denmark", value: "DK" },
                { label: "Ireland", value: "IE" },
                { label: "New Zealand", value: "NZ" },
                { label: "Other", value: "OTHER" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Authorized Representative Section */}
      <div className="mt-2">
        <h2 className="text-lg font-semibold text-primary">Authorized Representative</h2>
        <p className="text-sm text-tertiary">The primary point of contact authorized to act on behalf of the organization.</p>
      </div>
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Full Name</label>
            <input type="text" value={repName} onChange={(e) => setRepName(e.target.value)} placeholder="e.g. John Smith"
              className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Title / Role</label>
            <input type="text" value={repTitle} onChange={(e) => setRepTitle(e.target.value)} placeholder="e.g. CEO, COO, Managing Director"
              className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Email</label>
            <input type="email" value={repEmail} onChange={(e) => setRepEmail(e.target.value)} placeholder="representative@company.com"
              className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">Phone</label>
            <input type="tel" value={repPhone} onChange={(e) => setRepPhone(e.target.value)} placeholder="+1 (555) 000-0000"
              className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button color="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
        <Button color="primary" size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

// Map UI provider IDs to API provider names used in OAuth routes
const PROVIDER_API_MAP: Record<string, string> = {
  google_calendar: 'google',
  outlook_calendar: 'microsoft',
  zoom: 'zoom',
  teams: 'microsoft',
  slack: 'slack',
  gmail: 'google',
};

// Available integrations config — ordered per spec: Outlook → Teams → Zoom → Google Calendar → Gmail → Slack
const availableIntegrations = [
  { provider: "outlook_calendar", name: "Outlook Calendar", description: "Connect Microsoft Outlook for calendar sync.", features: ["Outlook 365 calendar sync", "Meeting room booking", "Shared calendar access", "Teams meeting integration"] },
  { provider: "teams", name: "Microsoft Teams", description: "Create Teams meetings and send notifications.", features: ["Teams meeting creation", "Channel notifications", "Presence status sync", "File sharing integration"] },
  { provider: "zoom", name: "Zoom", description: "Create Zoom meetings automatically.", features: ["Auto-generate meeting links", "Meeting recording access", "Attendee tracking", "Virtual background management"] },
  { provider: "google_calendar", name: "Google Calendar", description: "Sync your Google Calendar events and meetings.", features: ["Two-way calendar sync", "Auto-detect conflicts", "Meeting RSVP management", "Color-coded event categories"] },
  { provider: "gmail", name: "Gmail", description: "Connect Gmail for email integration.", comingSoon: true, features: ["Email tracking", "Template management", "Contact auto-import", "Thread monitoring"] },
  { provider: "slack", name: "Slack", description: "Send notifications to channels.", comingSoon: true, features: ["Task notifications", "Daily digest summaries", "Approval request alerts", "Channel-specific routing"] },
];

// Types for integration data
interface IntegrationData {
  id: string;
  provider: string;
  integration_type: string;
  status: string;
  provider_email?: string;
  last_synced_at?: string;
}

function IntegrationsTab() {
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'installed'>('all');
  const [detailIntegration, setDetailIntegration] = useState<(typeof availableIntegrations)[number] | null>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/integrations');
        if (!response.ok) throw new Error('Failed to fetch integrations');
        const result = await response.json();
        const integrationsList = result.data?.data ?? result.data ?? [];
        setConnectedIntegrations(Array.isArray(integrationsList) ? integrationsList : []);
      } catch (err) {
        console.error('Failed to fetch integrations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntegrations();

    // Handle OAuth redirect params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      notify.success('Integration connected', 'Your integration has been successfully connected.');
      window.history.replaceState({}, '', '/settings?tab=integrations');
    } else if (urlParams.get('error')) {
      const errorMsg = urlParams.get('error');
      const provider = urlParams.get('provider');
      if (errorMsg === 'oauth_not_configured') {
        const providerName = provider === 'google' ? 'Google'
          : provider === 'microsoft' ? 'Microsoft'
          : provider === 'slack' ? 'Slack'
          : provider === 'zoom' ? 'Zoom'
          : 'This provider';
        notify.error(
          `${providerName} OAuth isn't set up yet`,
          'An admin needs to add valid OAuth credentials in the server .env. Contact support to enable this integration.',
        );
      } else {
        notify.error('Connection failed', `Failed to connect integration: ${errorMsg}`);
      }
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }
  }, []);

  const isConnected = (provider: string) => {
    const apiProvider = PROVIDER_API_MAP[provider] || provider;
    return connectedIntegrations.some(i => i.provider === apiProvider && i.status === 'active');
  };

  const getConnectedData = (provider: string) => {
    const apiProvider = PROVIDER_API_MAP[provider] || provider;
    return connectedIntegrations.find(i => i.provider === apiProvider && i.status === 'active');
  };

  const handleConnect = (provider: string) => {
    const apiProvider = PROVIDER_API_MAP[provider] || provider;
    window.location.href = `/api/integrations/${apiProvider}/connect`;
  };

  const handleDisconnect = (provider: string) => {
    setDisconnectTarget(provider);
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    const apiProvider = PROVIDER_API_MAP[disconnectTarget] || disconnectTarget;
    try {
      const response = await fetch(`/api/integrations/${apiProvider}/disconnect`, {
        method: 'POST',
      });
      if (response.ok) {
        setConnectedIntegrations(prev =>
          prev.map(i => i.provider === apiProvider ? { ...i, status: 'revoked' } : i)
        );
        notify.success('Disconnected', `${disconnectTarget} has been disconnected.`);
      } else {
        notify.error('Error', 'Failed to disconnect integration.');
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
      notify.error('Error', 'Failed to disconnect integration.');
    } finally {
      setDisconnectTarget(null);
    }
  };

  const filteredIntegrations = filterTab === 'installed'
    ? availableIntegrations.filter(i => isConnected(i.provider))
    : availableIntegrations;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading integrations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load integrations</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Integrations</h2>
          <p className="text-sm text-tertiary">Connect your calendars, email, and other tools.</p>
        </div>
        <Button color="secondary" size="sm" iconLeading={Plus}>Request integration</Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 w-fit">
        <button
          onClick={() => setFilterTab('all')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterTab === 'all' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          All ({availableIntegrations.length})
        </button>
        <button
          onClick={() => setFilterTab('installed')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${filterTab === 'installed' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Installed ({connectedIntegrations.filter(i => i.status === 'active').length})
        </button>
      </div>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredIntegrations.map((integration) => {
          const connected = isConnected(integration.provider);
          const connectedData = getConnectedData(integration.provider);
          const LogoComponent = integrationLogos[integration.provider];
          const isSoon = 'comingSoon' in integration && integration.comingSoon;
          return (
            <li key={integration.provider} className={`rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset${isSoon ? ' opacity-75' : ''}`}>
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-xs ring-1 ring-secondary ring-inset dark:bg-gray-800">
                      {LogoComponent ? <LogoComponent /> : <Clock className="h-8 w-8 text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-primary">{integration.name}</p>
                        {isSoon && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      {connectedData?.provider_email && (
                        <p className="text-xs text-tertiary">{connectedData.provider_email}</p>
                      )}
                    </div>
                  </div>
                  {connected && !isSoon && (
                    <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">Connected</span>
                  )}
                </div>
                <p className="text-sm text-tertiary">{integration.description}</p>
              </div>
              <div className="flex items-center justify-between border-t border-secondary px-5 py-3">
                <button
                  onClick={() => setDetailIntegration(integration)}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Learn more
                </button>
                {isSoon ? (
                  <Button color="secondary" size="sm" isDisabled title="This integration will be available soon">
                    Coming Soon
                  </Button>
                ) : connected ? (
                  <Button color="secondary" size="sm" onClick={() => handleDisconnect(integration.provider)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button color="primary" size="sm" onClick={() => handleConnect(integration.provider)}>
                    Connect
                  </Button>
                )}
              </div>
            </li>
          );
        })}
        {filteredIntegrations.length === 0 && (
          <li className="col-span-full py-12 text-center">
            <p className="text-sm text-tertiary">No installed integrations yet. Browse the &quot;All&quot; tab to get started.</p>
          </li>
        )}
      </ul>

      {/* Integration Detail Modal */}
      {detailIntegration && (() => {
        const DetailLogo = integrationLogos[detailIntegration.provider];
        const isDetailSoon = 'comingSoon' in detailIntegration && detailIntegration.comingSoon;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailIntegration(null)}>
            <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-xs ring-1 ring-gray-200 ring-inset dark:bg-gray-800 dark:ring-gray-700">
                  {DetailLogo ? <DetailLogo /> : <Clock className="h-10 w-10 text-gray-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{detailIntegration.name}</h3>
                    {isDetailSoon && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{detailIntegration.description}</p>
                </div>
              </div>
              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Features</h4>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {detailIntegration.features?.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                      <span className="mt-0.5 text-success-500">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 flex gap-3">
                <Button size="sm" color="secondary" className="flex-1" onClick={() => setDetailIntegration(null)}>Close</Button>
                {isDetailSoon ? (
                  <Button size="sm" color="secondary" className="flex-1" isDisabled>
                    Coming Soon
                  </Button>
                ) : isConnected(detailIntegration.provider) ? (
                  <Button size="sm" color="secondary" className="flex-1" onClick={() => { handleDisconnect(detailIntegration.provider); setDetailIntegration(null); }}>
                    Disconnect
                  </Button>
                ) : (
                  <Button size="sm" color="primary" className="flex-1" onClick={() => handleConnect(detailIntegration.provider)}>
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Disconnect Confirmation */}
      <ConfirmationDialog
        isOpen={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={confirmDisconnect}
        title="Disconnect Integration?"
        description={`This will disconnect ${disconnectTarget || "this integration"}. You can reconnect it later.`}
        confirmLabel="Disconnect"
        variant="warning"
      />
    </div>
  );
}

// Types for team data
interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

function TeamTab() {
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<string>("user");
  const [editName, setEditName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Fetch team members
  const fetchTeam = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/team');
      if (!response.ok) throw new Error('Failed to fetch team');
      const result = await response.json();
      const teamData = result.data?.data ?? result.data;
      setMembers(teamData?.members || []);
      setPendingInvitations(teamData?.pending_invitations || []);
    } catch (err) {
      console.error('Failed to fetch team:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  // Handle invite member
  const handleInviteMember = async (memberData: InviteMemberData) => {
    try {
      const response = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: memberData.email,
          role: memberData.role,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }
      notify.success('Invitation sent', `An invitation has been sent to ${memberData.email}.`);
      setIsInviteMemberOpen(false);
      fetchTeam();
    } catch (err) {
      console.error('Failed to invite member:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to send invitation.');
    }
  };

  // Handle edit member
  const openEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setEditRole(member.role || "user");
    setEditName(member.full_name || "");
    setEditJobTitle((member as any).job_title || "");
  };

  const handleSaveEditMember = async () => {
    if (!editingMember) return;
    setIsSavingMember(true);
    try {
      const response = await fetch(`/api/settings/team/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          full_name: editName || undefined,
          job_title: editJobTitle || null,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to update member');
      }
      notify.success('Member updated', `${editingMember.full_name || editingMember.email}'s details have been updated.`);
      setEditingMember(null);
      fetchTeam();
    } catch (err) {
      console.error('Failed to update member:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to update member.');
    } finally {
      setIsSavingMember(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/settings/team/${memberId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to remove member');
      }
      notify.success('Access revoked', 'Team member access has been revoked.');
      setRemovingMemberId(null);
      fetchTeam();
    } catch (err) {
      console.error('Failed to remove member:', err);
      notify.error('Error', err instanceof Error ? err.message : 'Failed to remove member.');
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0].charAt(0)}${parts[1].charAt(0)}` : parts[0].charAt(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load team</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => fetchTeam()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Team Members</h2>
          <p className="text-sm text-tertiary">Manage your team and their access levels.</p>
        </div>
        <Button color="primary" size="sm" iconLeading={Plus} onClick={() => setIsInviteMemberOpen(true)}>Invite member</Button>
      </div>
      
      {/* Active Members */}
      <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
        <ul className="divide-y divide-secondary">
          {members.length === 0 ? (
            <li className="p-4 text-center text-sm text-tertiary">No team members yet</li>
          ) : (
            members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <Avatar size="md" initials={getInitials(member.full_name || member.email)} alt={member.full_name || member.email} />
                  <div>
                    <p className="text-sm font-medium text-primary">{member.full_name || 'Unnamed User'}</p>
                    <p className="text-sm text-tertiary">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${member.role === "admin" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-700"}`}>
                    {member.role === "admin" ? "Admin" : "User"}
                  </span>
                  <Button color="tertiary" size="sm" onClick={() => openEditMember(member)}>Edit</Button>
                  <Button color="tertiary" size="sm" className="text-error-600 hover:text-error-700" onClick={() => setRemovingMemberId(member.id)}>Remove</Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-secondary">Pending Invitations</h3>
          <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
            <ul className="divide-y divide-secondary">
              {pendingInvitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar size="md" initials="?" alt={invitation.email} />
                    <div>
                      <p className="text-sm font-medium text-primary">{invitation.email}</p>
                      <p className="text-xs text-tertiary">Expires: {new Date(invitation.expires_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-700">
                      Pending
                    </span>
                    <Button color="tertiary" size="sm">Resend</Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Team Member</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update {editingMember.full_name || editingMember.email}&apos;s details and role.
            </p>
            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <Input size="sm" value={editName} onChange={(val: string) => setEditName(val)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Title</label>
                <Input size="sm" value={editJobTitle} onChange={(val: string) => setEditJobTitle(val)} placeholder="e.g., Executive Assistant" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <NativeSelect
                  size="sm"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  options={[
                    { label: "Admin", value: "admin" },
                    { label: "User", value: "user" },
                  ]}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button size="md" color="secondary" className="flex-1" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button size="md" color="primary" className="flex-1" onClick={handleSaveEditMember} disabled={isSavingMember}>
                {isSavingMember ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation */}
      {removingMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
              <svg className="h-6 w-6 text-error-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revoke Access</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to remove this team member? They will no longer be able to access the platform. This action can be reversed by an admin.
            </p>
            <div className="mt-6 flex gap-3">
              <Button size="md" color="secondary" className="flex-1" onClick={() => setRemovingMemberId(null)}>
                Cancel
              </Button>
              <Button size="md" color="primary" className="flex-1 !bg-error-600 hover:!bg-error-700" onClick={() => handleRemoveMember(removingMemberId)}>
                Revoke Access
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Slideout */}
      <InviteMemberSlideout
        isOpen={isInviteMemberOpen}
        onOpenChange={setIsInviteMemberOpen}
        onSubmit={handleInviteMember}
      />
    </div>
  );
}

// Types for billing data
interface BillingData {
  subscription_tier?: string;
  subscription_status?: string;
  billing_cycle?: string;
  current_period_end?: string;
}

const AVAILABLE_PLANS = [
  { id: 'starter', name: 'Starter', price: '$29', period: 'month', stripe_price_id: undefined as string | undefined, features: ['Up to 2 executives', 'Task management', 'Basic calendar', 'Email support'] },
  { id: 'professional', name: 'Professional', price: '$49', period: 'month', stripe_price_id: undefined as string | undefined, features: ['Up to 10 executives', 'All integrations', 'AI assistant', 'Priority support', 'Custom reports'], popular: true },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', period: 'month', stripe_price_id: undefined as string | undefined, features: ['Unlimited executives', 'SSO & SAML', 'Dedicated account manager', 'Custom SLA', 'API access'] },
];

const CANCEL_REASONS = [
  { label: 'Too expensive', value: 'too_expensive' },
  { label: 'Switching to a competitor', value: 'competitor' },
  { label: 'Missing features I need', value: 'missing_features' },
  { label: 'Not using it enough', value: 'not_using' },
  { label: 'Other', value: 'other' },
];

function BillingTab() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchBilling = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch both org data and Stripe subscription in parallel
        const [orgResponse, subResponse] = await Promise.all([
          fetch('/api/settings/organization'),
          fetch('/api/billing/subscription'),
        ]);

        if (orgResponse.ok) {
          const result = await orgResponse.json();
          const orgData = result.data?.data ?? result.data;
          if (orgData) {
            setBilling({
              subscription_tier: orgData.subscription_tier || 'free',
              subscription_status: orgData.subscription_status || 'active',
              billing_cycle: orgData.billing_cycle || 'monthly',
              current_period_end: orgData.current_period_end,
            });
          }
        }

        if (subResponse.ok) {
          const subResult = await subResponse.json();
          const subData = subResult.data?.data ?? subResult.data;
          if (subData) {
            setSubscriptionData(subData);
            // Update billing with Stripe data if available
            if (subData.current_period_end) {
              setBilling(prev => prev ? { ...prev, current_period_end: subData.current_period_end } : prev);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch billing:', err);
        setError(err instanceof Error ? err.message : 'Failed to load billing');
      } finally {
        setIsLoading(false);
      }
    };
    fetchBilling();
  }, []);

  const handleSelectPlan = async (planId: string, priceId?: string) => {
    if (planId === 'enterprise') {
      window.open('mailto:sales@tryjennifer.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }
    if (!priceId) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: priceId }),
      });
      const result = await response.json();
      const data = result.data?.data ?? result.data;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        notify.error('Error', 'Failed to create checkout session.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      notify.error('Error', 'Failed to start checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManageBilling = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/billing/create-portal', {
        method: 'POST',
      });
      const result = await response.json();
      const data = result.data?.data ?? result.data;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        notify.error('Error', 'No active billing account found. Please subscribe to a plan first.');
      }
    } catch (err) {
      console.error('Portal error:', err);
      notify.error('Error', 'Failed to open billing portal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlanInfo = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'trial': return { name: 'Trial', price: '$0', features: '14-day free trial', badge: 'Trial' };
      case 'starter': return { name: 'Starter', price: '$29', features: 'Core features', badge: 'Active' };
      case 'professional': case 'pro': return { name: 'Professional', price: '$49', features: 'All features', badge: 'Active' };
      case 'enterprise': return { name: 'Enterprise', price: 'Custom', features: 'Custom pricing', badge: 'Active' };
      default: return { name: 'Free', price: '$0', features: 'Basic features', badge: 'Free' };
    }
  };

  const planInfo = getPlanInfo(billing?.subscription_tier || 'free');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading billing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load billing</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Billing & Subscription</h2>
        <p className="text-sm text-tertiary">Manage your subscription, plan, and payment methods.</p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-primary">Current Plan</h3>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                {planInfo.badge}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{planInfo.price}</span>
              <span className="text-sm text-tertiary">/ {billing?.billing_cycle || 'month'}</span>
            </div>
            <p className="mt-1 text-sm text-tertiary">{planInfo.name} plan — {planInfo.features}</p>
            {billing?.current_period_end && (
              <p className="mt-2 text-xs text-tertiary">
                Next invoice: {new Date(billing.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-secondary pt-5">
          <Button color="primary" size="sm" onClick={() => setShowUpgrade(true)}>Upgrade Plan</Button>
          <Button color="secondary" size="sm" onClick={() => setShowUpgrade(true)}>Downgrade Plan</Button>
          <Button color="secondary" size="sm" className="!text-error-600" onClick={() => setShowCancel(true)}>Cancel Subscription</Button>
        </div>
      </div>

      {/* Payment Method Card */}
      <div className="rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <h3 className="text-sm font-semibold text-primary">Payment Method</h3>
        {subscriptionData?.payment_method ? (
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-secondary p-4">
            <div className="flex h-10 w-14 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
              <CreditCard02 className="h-5 w-5 text-fg-quaternary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">•••• •••• •••• {subscriptionData.payment_method.last4}</p>
              <p className="text-xs text-tertiary capitalize">{subscriptionData.payment_method.brand} — Expires {String(subscriptionData.payment_method.exp_month).padStart(2, '0')}/{subscriptionData.payment_method.exp_year}</p>
            </div>
            <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">Default</span>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-secondary p-6 text-center">
            <CreditCard02 className="mx-auto h-8 w-8 text-fg-quaternary" />
            <p className="mt-2 text-sm text-tertiary">No payment method on file</p>
            <p className="text-xs text-tertiary">Add a card to subscribe to a paid plan.</p>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button color="secondary" size="sm" onClick={handleManageBilling} isDisabled={isProcessing}>
            {subscriptionData?.payment_method ? 'Manage Payment Methods' : 'Add Payment Method'}
          </Button>
        </div>
      </div>

      {/* Billing Question */}
      <div className="rounded-xl bg-gray-50 p-5 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Have a billing question?</p>
            <p className="text-xs text-tertiary">Our team is happy to help with any billing inquiries.</p>
          </div>
          <Button color="secondary" size="sm" onClick={() => window.open('mailto:billing@tryjennifer.com', '_blank')}>Contact Us</Button>
        </div>
      </div>

      {/* Upgrade/Downgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowUpgrade(false)}>
          <div className="mx-4 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Choose a Plan</h3>
            <p className="mt-1 text-sm text-gray-500">Select the plan that best fits your needs.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {AVAILABLE_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border p-5 ${plan.popular ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-medium text-white">Most Popular</span>
                  )}
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">{plan.name}</h4>
                  <div className="mt-2 flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-sm text-gray-500">/{plan.period}</span>
                  </div>
                  <ul className="mt-4 flex flex-col gap-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-success-500">&#10003;</span> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-4">
                    <Button
                      color={billing?.subscription_tier === plan.id ? 'secondary' : 'primary'}
                      size="sm"
                      className="w-full"
                      isDisabled={billing?.subscription_tier === plan.id || isProcessing}
                      onClick={() => handleSelectPlan(plan.id, plan.stripe_price_id)}
                    >
                      {billing?.subscription_tier === plan.id ? 'Current Plan' : plan.id === 'enterprise' ? 'Contact Sales' : isProcessing ? 'Processing...' : 'Select Plan'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button size="sm" color="secondary" onClick={() => setShowUpgrade(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCancel(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cancel Subscription</h3>
            <p className="mt-1 text-sm text-gray-500">We&apos;re sorry to see you go. Please let us know why you&apos;re cancelling so we can improve.</p>
            <div className="mt-4 flex flex-col gap-3">
              {CANCEL_REASONS.map((reason) => (
                <label key={reason.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={reason.value}
                    checked={cancelReason === reason.value}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{reason.label}</span>
                </label>
              ))}
            </div>
            {cancelReason === 'other' && (
              <textarea
                rows={3}
                placeholder="Please tell us more..."
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            )}
            <div className="mt-6 flex gap-3">
              <Button size="sm" color="secondary" className="flex-1" onClick={() => { setShowCancel(false); setCancelReason(''); setCancelFeedback(''); }}>Keep My Plan</Button>
              <Button size="sm" color="primary" className="flex-1 !bg-error-600 hover:!bg-error-700" isDisabled={!cancelReason || isProcessing} onClick={handleManageBilling}>
                {isProcessing ? 'Processing...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Types for audit log data
interface AuditLogEntry {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

function AuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Fetch audit logs
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/audit?limit=50');
        if (!response.ok) throw new Error('Failed to fetch audit log');
        const result = await response.json();
        const auditData = result.data?.data ?? result.data;
        setLogs(Array.isArray(auditData) ? auditData : []);
        const paginationData = result.data?.pagination ?? result.pagination;
        setTotal(paginationData?.total || 0);
      } catch (err) {
        console.error('Failed to fetch audit log:', err);
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format action for display
  const formatAction = (log: AuditLogEntry) => {
    if (log.entity_type) {
      return `${log.action} ${log.entity_type}`;
    }
    return log.action;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-tertiary">Loading audit log...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold text-primary">Unable to load audit log</p>
          <p className="text-sm text-tertiary max-w-md">{error}</p>
          <Button size="md" color="secondary" iconLeading={RefreshCw01} onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Audit Log</h2>
          <p className="text-sm text-tertiary">Track all activity in your workspace. {total > 0 && `(${total} entries)`}</p>
        </div>
      </div>
      <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary">
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-tertiary">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-tertiary">
                    No audit log entries yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-primary">{formatAction(log)}</td>
                    <td className="px-4 py-3 text-sm text-secondary">{(log as any).user?.email || log.user_email || 'System'}</td>
                    <td className="px-4 py-3 text-sm text-tertiary">{formatTimestamp(log.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-tertiary">{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
